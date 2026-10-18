import "dotenv/config";
import { fetch as undiciFetch } from "undici";
import { supabase } from "./supabaseClient.js";

/**
 * Valida DE VERDADE a foto principal dos anúncios FB que ainda estão com URL crua do
 * fbcdn: busca a imagem como o SITE busca (UA de navegador, SEM referer — o <img> usa
 * referrerPolicy="no-referrer") e vê se carrega (200) ou dá 403/erro. Regra do negócio:
 * VEÍCULO SEM FOTO NÃO É ACEITO → os quebrados viram status=rejeitada. Não chuta pelo `oe`.
 *
 * Uso: tsx src/validarFotosFb.ts [--dry]   (--dry só valida e conta; sem --dry rejeita os quebrados)
 */
const DRY = process.argv.includes("--dry");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CONCORRENCIA = 8;

async function carrega(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await undiciFetch(url, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(t));
    return r.ok; // 200-299 = foto carrega
  } catch {
    return false;
  }
}

/**
 * ⚠️⚠️ DOIS FUROS CONSERTADOS EM 18/10/2026, quando o Gustavo pediu "um limpa
 * nos que não têm mais fotos":
 *
 *   1. SÓ OLHAVA `foto_principal LIKE '%fbcdn%'` — e havia **274 anúncios
 *      paraguaios aprovados com foto_principal NULA**. Eles já não apareciam na
 *      vitrine (ela exige foto), mas entupiam o painel do admin com cartão
 *      vazio. Sem URL não há o que validar: a regra de negócio já basta.
 *
 *   2. NÃO FILTRAVA PAÍS. Hoje há 1.719 anúncios marcados `CL` (a praça
 *      "Concepción" era a do Chile) — validá-los seria gastar 1.719
 *      requisições HTTP para decidir sobre dado que não é da vitrine.
 *
 * ⚠️ `status = 'rejeitada'` e não DELETE: o anúncio fica revisável e a
 * observação de preço continua no livro, que é o ativo. Se o backfill de
 * fotos recuperar a imagem um dia, basta reaprovar.
 */
const PAIS = process.env.PY_PAIS ?? "PY";

async function main() {
  // ── 1) sem URL nenhuma: não há o que validar ──
  const semFoto: string[] = [];
  for (let ini = 0; ; ini += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id")
      .eq("pais", PAIS)
      .eq("status", "aprovada")
      .is("foto_principal", null)
      .range(ini, ini + 999);
    if (error) { console.error("ERRO:", error.message); return; }
    if (!data || data.length === 0) break;
    for (const o of data) semFoto.push(o.id as string);
    if (data.length < 1000) break;
  }
  console.log(`${semFoto.length} aprovados SEM foto_principal (nada a validar — a regra já decide)`);

  const alvos: { id: string; foto: string }[] = [];
  for (let ini = 0; ; ini += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, foto_principal")
      .eq("pais", PAIS)
      .eq("fonte", "FACEBOOK")
      .eq("status", "aprovada")
      .like("foto_principal", "%fbcdn%")
      .range(ini, ini + 999);
    if (error) {
      console.error("ERRO:", error.message);
      return;
    }
    if (!data || data.length === 0) break;
    for (const o of data) if (o.foto_principal) alvos.push({ id: o.id, foto: o.foto_principal });
    if (data.length < 1000) break;
  }

  console.log(`Validando ${alvos.length} anúncios FB (foto fbcdn) — carrega mesmo (200) ou 403?`);
  const quebrados: string[] = [];
  let ok = 0;
  for (let i = 0; i < alvos.length; i += CONCORRENCIA) {
    const lote = alvos.slice(i, i + CONCORRENCIA);
    const res = await Promise.all(lote.map((a) => carrega(a.foto)));
    res.forEach((bom, j) => (bom ? ok++ : quebrados.push(lote[j].id)));
    if (i % (CONCORRENCIA * 15) === 0) console.log(`  …${i + lote.length}/${alvos.length} (com foto ${ok}, quebrados ${quebrados.length})`);
  }

  console.log(`\nRESULTADO VALIDADO: ${ok} COM foto (200) · ${quebrados.length} SEM foto (403/erro).`);
  if (DRY) {
    console.log("(--dry: nada alterado — rode sem --dry pra rejeitar os sem-foto)");
    return;
  }
  // ★ Os sem-URL entram no mesmo lote de rejeição: a regra é a mesma
  //   ("veículo sem foto não entra"), só o caminho até ela é diferente.
  const paraRejeitar = [...semFoto, ...quebrados];
  let feitos = 0;
  for (let i = 0; i < paraRejeitar.length; i += 200) {
    const l = paraRejeitar.slice(i, i + 200);
    const { error } = await supabase.from("opportunities").update({ status: "rejeitada" }).in("id", l);
    if (error) console.error("  ! lote falhou:", error.message);
    else feitos += l.length;
  }
  console.log(`Rejeitados (regra: sem foto não entra): ${feitos}.`);
}

main();
