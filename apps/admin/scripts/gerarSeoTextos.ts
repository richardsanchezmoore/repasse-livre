import "./_carregarEnv"; // PRIMEIRO — popula process.env de .env.local
import { supabaseAdmin } from "@/lib/supabase";
import { extrairMarca, extrairModeloSeo } from "@/lib/marca";
import { gerarSlugCidade, gerarSlugEstado, slugify } from "@/lib/slug";
import { NOME_POR_UF } from "@/lib/estados";
import { gerarSeoTextoLLM, fingerprintSeo, type ContextoSeo } from "@/lib/seoTextoLLM";

/**
 * Gera e ARMAZENA a prosa de SEO das páginas de CATEGORIA (cidade/estado/marca/
 * modelo) em seo_textos. Mesma mecânica do gerar:pareceres: roda FORA do request,
 * só regera quando os fatos mudam (fingerprint), e a página só LÊ. Marca/modelo
 * são escopados por CIDADE e por ESTADO (as duas formas de URL), com gate de volume.
 *
 * DRY-RUN por padrão. --aplicar gera e grava. Uso:
 *   npm run gerar:seo-textos [--aplicar] [--limit=N] [--min-cidade=N] [--min-marca=N] [--min-modelo=N] [--tipo=cidade|estado|marca|modelo]
 */

const APLICAR = process.argv.includes("--aplicar");
const LIMITE = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || Infinity;
const MIN_CIDADE = Number(process.argv.find((a) => a.startsWith("--min-cidade="))?.split("=")[1]) || 10;
const MIN_MARCA = Number(process.argv.find((a) => a.startsWith("--min-marca="))?.split("=")[1]) || 12;
const MIN_MODELO = Number(process.argv.find((a) => a.startsWith("--min-modelo="))?.split("=")[1]) || 5;
const SO_TIPO = process.argv.find((a) => a.startsWith("--tipo="))?.split("=")[1] || null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Candidato {
  tipo: "cidade" | "estado" | "marca" | "modelo";
  chave: string;
  ctx: ContextoSeo;
}

function topMarcas(m: Map<string, number>, n: number): string[] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([marca]) => marca);
}

async function main(): Promise<void> {
  // Agregados. localidade "route slug" = o segmento usado na URL (citySlug ou
  // estadoSlug por extenso) — as chaves de marca/modelo espelham o que a página lê.
  const estados = new Map<string, { count: number; marcas: Map<string, number> }>();
  const cidades = new Map<string, { cidade: string; estado: string; count: number; marcas: Map<string, number> }>();
  const marcas = new Map<string, { marca: string; nome: string; count: number }>(); // key `${routeSlug}:${marcaSlug}`
  const modelos = new Map<string, { marca: string; modelo: string; nome: string; count: number }>(); // key `${routeSlug}:${marcaSlug}:${modeloSlug}`

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
      const veiculo = l.veiculo ?? "";
      const marca = veiculo ? extrairMarca(veiculo) : null;
      const modelo = veiculo ? extrairModeloSeo(veiculo) : null;
      const estadoNome = NOME_POR_UF[l.estado] ?? l.estado;

      // Localidades desta linha: estado (sempre) + cidade (se houver). Cada uma dá
      // um routeSlug + nome por extenso.
      const locais: { routeSlug: string; nome: string }[] = [
        { routeSlug: gerarSlugEstado(l.estado), nome: estadoNome },
      ];
      if (l.cidade) {
        const cslug = gerarSlugCidade({ cidade: l.cidade, estado: l.estado });
        if (cslug !== "sem-localizacao") locais.push({ routeSlug: cslug, nome: `${l.cidade}, ${estadoNome}` });
      }

      // Top-level estado
      if (!estados.has(l.estado)) estados.set(l.estado, { count: 0, marcas: new Map() });
      const e = estados.get(l.estado)!;
      e.count++;
      if (marca) e.marcas.set(marca, (e.marcas.get(marca) ?? 0) + 1);
      // Top-level cidade
      if (l.cidade) {
        const cslug = gerarSlugCidade({ cidade: l.cidade, estado: l.estado });
        if (cslug !== "sem-localizacao") {
          if (!cidades.has(cslug)) cidades.set(cslug, { cidade: l.cidade, estado: l.estado, count: 0, marcas: new Map() });
          const c = cidades.get(cslug)!;
          c.count++;
          if (marca) c.marcas.set(marca, (c.marcas.get(marca) ?? 0) + 1);
        }
      }
      // Marca e Modelo — por localidade (cidade E estado)
      if (marca) {
        const mSlug = slugify(marca);
        for (const loc of locais) {
          const kMarca = `${loc.routeSlug}:${mSlug}`;
          if (!marcas.has(kMarca)) marcas.set(kMarca, { marca, nome: loc.nome, count: 0 });
          marcas.get(kMarca)!.count++;
          if (modelo) {
            const kModelo = `${loc.routeSlug}:${mSlug}:${slugify(modelo)}`;
            if (!modelos.has(kModelo)) modelos.set(kModelo, { marca, modelo, nome: loc.nome, count: 0 });
            modelos.get(kModelo)!.count++;
          }
        }
      }
    }
    total += linhas.length;
    if (linhas.length < 1000) break;
  }

  const candidatos: Candidato[] = [];
  const querTipo = (t: string) => !SO_TIPO || SO_TIPO === t;
  if (querTipo("estado"))
    for (const [uf, ag] of estados)
      candidatos.push({ tipo: "estado", chave: uf.toLowerCase(), ctx: { tipo: "estado", localidade: NOME_POR_UF[uf] ?? uf, total: ag.count, marcasTop: topMarcas(ag.marcas, 3) } });
  if (querTipo("cidade"))
    for (const [slug, ag] of cidades) {
      if (ag.count < MIN_CIDADE) continue;
      candidatos.push({ tipo: "cidade", chave: slug, ctx: { tipo: "cidade", localidade: `${ag.cidade}, ${NOME_POR_UF[ag.estado] ?? ag.estado}`, total: ag.count, marcasTop: topMarcas(ag.marcas, 3) } });
    }
  if (querTipo("marca"))
    for (const [chave, ag] of marcas) {
      if (ag.count < MIN_MARCA) continue;
      candidatos.push({ tipo: "marca", chave, ctx: { tipo: "marca", localidade: ag.nome, marca: ag.marca, total: ag.count } });
    }
  if (querTipo("modelo"))
    for (const [chave, ag] of modelos) {
      if (ag.count < MIN_MODELO) continue;
      candidatos.push({ tipo: "modelo", chave, ctx: { tipo: "modelo", localidade: ag.nome, marca: ag.marca, modelo: ag.modelo, total: ag.count } });
    }

  // Fingerprints já gravados — só regera o que mudou.
  const { data: existentes } = await supabaseAdmin.from("seo_textos").select("tipo, chave, fingerprint");
  const fpAtual = new Map<string, string | null>();
  for (const r of (existentes as { tipo: string; chave: string; fingerprint: string | null }[] | null) ?? [])
    fpAtual.set(`${r.tipo}|${r.chave}`, r.fingerprint);

  console.log(`[seo-textos] ${total} anúncios → ${candidatos.length} candidatos (estado ${estados.size} · cidade≥${MIN_CIDADE} · marca≥${MIN_MARCA} · modelo≥${MIN_MODELO})${SO_TIPO ? ` [só ${SO_TIPO}]` : ""}. Modo: ${APLICAR ? "APLICAR" : "DRY-RUN"}.`);
  if (APLICAR && !process.env.ANTHROPIC_API_KEY) { console.log("[seo-textos] ERRO: --aplicar sem ANTHROPIC_API_KEY."); process.exit(1); }

  let jaFrescos = 0, pendentes = 0, gerados = 0, falhas = 0;
  for (const c of candidatos) {
    const fp = fingerprintSeo(c.ctx);
    if (fpAtual.get(`${c.tipo}|${c.chave}`) === fp) { jaFrescos++; continue; }
    pendentes++;
    if (!APLICAR) { if (pendentes <= 4) console.log(`  pendente [${c.tipo}] ${c.chave} — ${c.ctx.localidade} (${c.ctx.total})`); continue; }
    if (gerados + falhas >= LIMITE) continue;

    const texto = await gerarSeoTextoLLM(c.ctx);
    if (!texto) { falhas++; continue; }
    const { error } = await supabaseAdmin
      .from("seo_textos")
      .upsert({ tipo: c.tipo, chave: c.chave, texto, fingerprint: fp, gerado_em: new Date().toISOString() }, { onConflict: "tipo,chave" });
    if (error) { falhas++; console.log(`  ⚠️  ${c.tipo}/${c.chave}: ${error.message}`); continue; }
    gerados++;
    if (gerados % 25 === 0) console.log(`[seo-textos] ${gerados} gerados…`);
    await sleep(120);
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
