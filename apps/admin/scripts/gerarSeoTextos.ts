import "./_carregarEnv"; // PRIMEIRO — popula process.env de .env.local
import { supabaseAdmin } from "@/lib/supabase";
import { extrairMarca } from "@/lib/marca";
import { gerarSlugCidade } from "@/lib/slug";
import { NOME_POR_UF } from "@/lib/estados";
import { gerarSeoTextoLLM, fingerprintSeo, type ContextoSeo } from "@/lib/seoTextoLLM";

/**
 * Gera e ARMAZENA a prosa de SEO das páginas de CATEGORIA (v1: CIDADE + ESTADO —
 * o topo de tráfego orgânico no Search Console) em seo_textos. Mesma mecânica do
 * gerar:pareceres: roda FORA do request, só regera quando os fatos mudam
 * (fingerprint), e a página só LÊ. Marca/Modelo usam o template por enquanto (a
 * chave escopada por cidade+estado explode em combinações — extensão futura).
 *
 * DRY-RUN por padrão. --aplicar gera e grava. Uso:
 *   npm run gerar:seo-textos [--aplicar] [--limit=N] [--min-cidade=N]
 */

const APLICAR = process.argv.includes("--aplicar");
const LIMITE = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || Infinity;
// Cidade com poucas ofertas gera página fina — só gera prosa acima do piso.
const MIN_CIDADE = Number(process.argv.find((a) => a.startsWith("--min-cidade="))?.split("=")[1]) || 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Agregado {
  count: number;
  marcas: Map<string, number>;
}

function topMarcas(m: Map<string, number>, n: number): string[] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([marca]) => marca);
}

interface Candidato {
  tipo: "cidade" | "estado";
  chave: string;
  ctx: ContextoSeo;
}

async function main(): Promise<void> {
  // Varre todas as aprovadas (cidade, estado, veiculo), agrega por cidade e estado.
  const cidades = new Map<string, { cidade: string; estado: string } & Agregado>();
  const estados = new Map<string, Agregado>();
  let total = 0;
  for (let inicio = 0; ; inicio += 1000) {
    const { data, error } = await supabaseAdmin
      .from("opportunities")
      .select("cidade, estado, veiculo")
      .eq("status", "aprovada")
      .range(inicio, inicio + 999);
    if (error) throw new Error(`listar: ${error.message}`);
    const linhas = (data as { cidade: string | null; estado: string | null; veiculo: string | null }[] | null) ?? [];
    for (const l of linhas) {
      if (!l.estado) continue;
      const marca = l.veiculo ? extrairMarca(l.veiculo) : null;
      // estado
      if (!estados.has(l.estado)) estados.set(l.estado, { count: 0, marcas: new Map() });
      const e = estados.get(l.estado)!;
      e.count++;
      if (marca) e.marcas.set(marca, (e.marcas.get(marca) ?? 0) + 1);
      // cidade
      if (l.cidade) {
        const slug = gerarSlugCidade({ cidade: l.cidade, estado: l.estado });
        if (slug !== "sem-localizacao") {
          if (!cidades.has(slug)) cidades.set(slug, { cidade: l.cidade, estado: l.estado, count: 0, marcas: new Map() });
          const c = cidades.get(slug)!;
          c.count++;
          if (marca) c.marcas.set(marca, (c.marcas.get(marca) ?? 0) + 1);
        }
      }
    }
    total += linhas.length;
    if (linhas.length < 1000) break;
  }

  const candidatos: Candidato[] = [];
  for (const [uf, ag] of estados) {
    candidatos.push({
      tipo: "estado",
      chave: uf.toLowerCase(),
      ctx: { tipo: "estado", localidade: NOME_POR_UF[uf] ?? uf, total: ag.count, marcasTop: topMarcas(ag.marcas, 3) },
    });
  }
  for (const [slug, ag] of cidades) {
    if (ag.count < MIN_CIDADE) continue;
    candidatos.push({
      tipo: "cidade",
      chave: slug,
      ctx: {
        tipo: "cidade",
        localidade: `${ag.cidade}, ${NOME_POR_UF[ag.estado] ?? ag.estado}`,
        total: ag.count,
        marcasTop: topMarcas(ag.marcas, 3),
      },
    });
  }

  // Fingerprints já gravados — só regera o que mudou.
  const { data: existentes } = await supabaseAdmin.from("seo_textos").select("tipo, chave, fingerprint");
  const fpAtual = new Map<string, string | null>();
  for (const r of (existentes as { tipo: string; chave: string; fingerprint: string | null }[] | null) ?? []) {
    fpAtual.set(`${r.tipo}|${r.chave}`, r.fingerprint);
  }

  console.log(`[seo-textos] ${total} anúncios → ${estados.size} estados + ${cidades.size} cidades (${candidatos.length} candidatos, piso cidade ${MIN_CIDADE}). Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);
  if (APLICAR && !process.env.ANTHROPIC_API_KEY) {
    console.log("[seo-textos] ERRO: --aplicar sem ANTHROPIC_API_KEY."); process.exit(1);
  }

  let jaFrescos = 0, pendentes = 0, gerados = 0, falhas = 0;
  for (const c of candidatos) {
    const fp = fingerprintSeo(c.ctx);
    if (fpAtual.get(`${c.tipo}|${c.chave}`) === fp) { jaFrescos++; continue; }
    pendentes++;
    if (!APLICAR) {
      if (pendentes <= 3) console.log(`  pendente [${c.tipo}] ${c.chave} — ${c.ctx.localidade} (${c.ctx.total})`);
      continue;
    }
    if (gerados + falhas >= LIMITE) continue;

    const texto = await gerarSeoTextoLLM(c.ctx);
    if (!texto) { falhas++; continue; }
    const { error } = await supabaseAdmin
      .from("seo_textos")
      .upsert({ tipo: c.tipo, chave: c.chave, texto, fingerprint: fp, gerado_em: new Date().toISOString() }, { onConflict: "tipo,chave" });
    if (error) { falhas++; console.log(`  ⚠️  ${c.tipo}/${c.chave}: ${error.message}`); continue; }
    gerados++;
    if (gerados % 25 === 0) console.log(`[seo-textos] ${gerados} gerados…`);
    await sleep(120); // gentil com o rate limit
  }

  console.log(
    `[seo-textos] ${APLICAR ? "APLICADO" : "SIMULAÇÃO"}: ${jaFrescos} já frescos | ${pendentes} pendentes` +
      (APLICAR ? ` | ${gerados} gerados | ${falhas} falhas` : " (rode com --aplicar pra gerar)")
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("[seo-textos] Falha:", e);
  process.exit(1);
});
