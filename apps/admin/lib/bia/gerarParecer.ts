import { supabaseAdmin } from "@/lib/supabase";
import { computarFactSheet } from "./factSheet";
import { gerarParecerLLM, fingerprintParecer } from "./parecerLLM";
import type { AnuncioBia, PontoPreco } from "./tipos";

/**
 * Gera e ARMAZENA o parecer de UM anúncio (caminho do evento em tempo real —
 * disparado pelo worker no salvarOportunidade quando detecta anúncio novo ou
 * mudança de preço). Espelha o gerarPareceres.ts (batch), mas pra um só link.
 * Só regenera se o fingerprint mudou. É aqui que, na Fase seguinte, entra o
 * matching de notificações (Duster do usuário X → push/WhatsApp).
 */

type Resultado = "gerado" | "ja_fresco" | "sem_prosa" | "sem_fipe" | "nao_encontrado";

const CAMPOS =
  "id, fipe_codigo, veiculo, ano, estado, preco, fipe_valor, margem_percentual, km, data_captura, foto_principal, fotos_secundarias, descricao, atributos_olx, link_origem, status, copiloto_fingerprint";

type Linha = AnuncioBia & {
  id: string;
  veiculo: string | null;
  ano: string | null;
  status: string | null;
  copiloto_fingerprint: string | null;
};

export async function gerarParecerPorLink(linkOrigem: string): Promise<Resultado> {
  const { data: bruto } = await supabaseAdmin.from("opportunities").select(CAMPOS).eq("link_origem", linkOrigem).maybeSingle();
  if (!bruto) return "nao_encontrado";
  const anuncio = bruto as Linha;
  if (!anuncio.fipe_codigo) return "sem_fipe";

  // Coorte (mercado) do mesmo fipe_codigo — a parte relativa do fact-sheet.
  const universo: AnuncioBia[] = [];
  for (let inicio = 0; ; inicio += 1000) {
    const { data } = await supabaseAdmin
      .from("opportunities")
      .select(CAMPOS)
      .eq("fipe_codigo", anuncio.fipe_codigo)
      .range(inicio, inicio + 999);
    if (!data || data.length === 0) break;
    universo.push(...(data as Linha[]).filter((a) => a.status !== "rejeitada"));
    if (data.length < 1000) break;
  }

  const { data: log } = await supabaseAdmin
    .from("anuncio_preco_log")
    .select("preco, visto_em")
    .eq("link_origem", linkOrigem);

  const fs = computarFactSheet(anuncio, universo, (log as PontoPreco[] | null) ?? []);
  const ctx = { veiculo: anuncio.veiculo, ano: anuncio.ano };
  const fp = fingerprintParecer(fs, ctx);
  if (anuncio.copiloto_fingerprint === fp) return "ja_fresco";

  const prosa = await gerarParecerLLM(fs, ctx);
  if (!prosa) return "sem_prosa";

  await supabaseAdmin
    .from("opportunities")
    .update({ copiloto_parecer: prosa, copiloto_gerado_em: new Date().toISOString(), copiloto_fingerprint: fp })
    .eq("id", anuncio.id);
  return "gerado";
}
