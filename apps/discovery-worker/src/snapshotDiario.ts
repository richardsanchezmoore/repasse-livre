import { supabase } from "./supabaseClient.js";

// Mesma heurística de apps/admin/lib/marca.ts (extrairMarcaModelo) —
// duplicada aqui porque são apps/pacotes separados (mesmo princípio já
// usado pra `slugify` em geocodingService.ts). Título sempre começa com
// marca + modelo ("Honda Civic...", "Fiat Mobi..."); falha em marcas de
// duas palavras (Land Rover, Great Wall) — aceitável pra tendência
// agregada, não para identificação exata de um anúncio.
function extrairMarcaModelo(titulo: string): { marca: string; modelo: string } | null {
  const [marca, modelo] = titulo.trim().split(/\s+/);
  if (!marca || !modelo) return null;
  return { marca, modelo };
}

interface LinhaOportunidade {
  veiculo: string;
  estado: string | null;
  preco: number;
  fipe_valor: number | null;
  margem_percentual: number | null;
}

interface Agregado {
  marca: string;
  modelo: string;
  estado: string | null;
  quantidade: number;
  somaPreco: number;
  somaFipe: number;
  contagemFipe: number;
  somaMargem: number;
  contagemMargem: number;
}

function chaveAgregado(marca: string, modelo: string, estado: string | null): string {
  return `${marca}|${modelo}|${estado ?? ""}`;
}

function acumular(mapa: Map<string, Agregado>, marca: string, modelo: string, estado: string | null, linha: LinhaOportunidade): void {
  const chave = chaveAgregado(marca, modelo, estado);
  const atual =
    mapa.get(chave) ??
    ({ marca, modelo, estado, quantidade: 0, somaPreco: 0, somaFipe: 0, contagemFipe: 0, somaMargem: 0, contagemMargem: 0 } as Agregado);

  atual.quantidade++;
  atual.somaPreco += linha.preco;
  if (linha.fipe_valor !== null) {
    atual.somaFipe += linha.fipe_valor;
    atual.contagemFipe++;
  }
  if (linha.margem_percentual !== null) {
    atual.somaMargem += linha.margem_percentual;
    atual.contagemMargem++;
  }

  mapa.set(chave, atual);
}

/**
 * Gera o snapshot agregado (marca+modelo, nacional e por estado) do dia
 * corrente — idempotente por data (upsert), e pula inteiro se já existir
 * algum snapshot pra hoje (chamado a cada execução do cron de varredura,
 * mas só faz o trabalho pesado uma vez por dia).
 */
export async function gerarSnapshotDiario(): Promise<void> {
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: jaExiste, error: erroConsulta } = await supabase
    .from("bi_snapshot_diario")
    .select("id")
    .eq("data", hoje)
    .limit(1)
    .maybeSingle();
  if (erroConsulta) {
    console.warn(`[snapshot-diario] Falha ao checar snapshot existente: ${erroConsulta.message}`);
    return;
  }
  if (jaExiste) {
    console.log(`[snapshot-diario] Já existe snapshot pra ${hoje}, pulando.`);
    return;
  }

  // "Estoque" representa tudo que o motor de descoberta já viu e ainda não
  // descartou — não só o que o admin já aprovou (descoberta/aprovada/
  // enviada), excluindo rejeitada. Inserção direta fica fora: é um fluxo
  // de oferta diferente (vendedor avulso, não o "mercado" capturado da OLX).
  const { data, error } = await supabase
    .from("opportunities")
    .select("veiculo, estado, preco, fipe_valor, margem_percentual")
    .eq("origem_tipo", "descoberta")
    .neq("status", "rejeitada");

  if (error) {
    console.warn(`[snapshot-diario] Falha ao buscar oportunidades: ${error.message}`);
    return;
  }

  const agregados = new Map<string, Agregado>();
  for (const linha of data as LinhaOportunidade[]) {
    const marcaModelo = extrairMarcaModelo(linha.veiculo);
    if (!marcaModelo) continue;
    const { marca, modelo } = marcaModelo;

    acumular(agregados, marca, modelo, null, linha);
    if (linha.estado) {
      acumular(agregados, marca, modelo, linha.estado, linha);
    }
  }

  const linhasParaSalvar = [...agregados.values()].map((agregado) => ({
    data: hoje,
    marca: agregado.marca,
    modelo: agregado.modelo,
    estado: agregado.estado,
    quantidade: agregado.quantidade,
    preco_medio: agregado.quantidade > 0 ? Number((agregado.somaPreco / agregado.quantidade).toFixed(2)) : null,
    fipe_medio: agregado.contagemFipe > 0 ? Number((agregado.somaFipe / agregado.contagemFipe).toFixed(2)) : null,
    margem_media: agregado.contagemMargem > 0 ? Number((agregado.somaMargem / agregado.contagemMargem).toFixed(2)) : null,
  }));

  if (linhasParaSalvar.length === 0) {
    console.log("[snapshot-diario] Nenhum agregado pra salvar hoje.");
    return;
  }

  const { error: erroUpsert } = await supabase
    .from("bi_snapshot_diario")
    .upsert(linhasParaSalvar, { onConflict: "data,marca,modelo,estado" });

  if (erroUpsert) {
    console.warn(`[snapshot-diario] Falha ao salvar snapshot: ${erroUpsert.message}`);
    return;
  }

  console.log(`[snapshot-diario] Snapshot de ${hoje} salvo: ${linhasParaSalvar.length} linhas (marca+modelo, nacional + por estado).`);
}
