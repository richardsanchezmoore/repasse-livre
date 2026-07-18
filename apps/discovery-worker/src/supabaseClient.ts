import { createClient } from "@supabase/supabase-js";
import { buscarCoordenadasCidade } from "./geocodingService.js";
import { dispararEnriquecimento } from "./enriquecer.js";
import type { Oportunidade } from "./types.js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/** Upsert por link_origem para evitar duplicar a mesma oportunidade entre execuções. */
export async function salvarOportunidade(oportunidade: Oportunidade): Promise<void> {
  // Preço anterior (se já existe) — pra detectar mudança e logar no histórico de
  // preço, insumo do Copiloto ("2 reduções em uma semana").
  const { data: existente } = await supabase
    .from("opportunities")
    .select("preco")
    .eq("link_origem", oportunidade.link_origem)
    .maybeSingle();

  const { error } = await supabase
    .from("opportunities")
    .upsert({ ...oportunidade, ultimo_visto: new Date().toISOString() }, { onConflict: "link_origem" });

  if (error) {
    throw new Error(`Falha ao salvar oportunidade (${oportunidade.link_origem}): ${error.message}`);
  }

  // Só loga MUDANÇA de preço (o baseline já está em opportunities: data_captura +
  // preco). Best-effort: nunca derruba a captação por causa do log.
  const mudouPreco = existente != null && Number(existente.preco) !== Number(oportunidade.preco);
  if (mudouPreco) {
    await supabase
      .from("anuncio_preco_log")
      .insert({ link_origem: oportunidade.link_origem, preco: oportunidade.preco, origem: "scraper" });
  }

  // Event spine: anúncio NOVO ou mudança de preço → enriquece na hora (parecer do
  // Copiloto + FUTURO: notificações) via endpoint do admin. Best-effort/fail-open
  // (ver enriquecer.ts). É o único gatilho — cobre todos os motores.
  if (!existente || mudouPreco) {
    await dispararEnriquecimento(oportunidade.link_origem, existente ? "preco" : "novo");
  }
}

export interface OportunidadeDuplicada {
  id: string;
  preco: number;
  origem_tipo: string;
  fonte: string;
  classificacao: string | null;
  margem_percentual: number | null;
  status: string;
  data_captura: string;
  // Identidade do modelo — pra o histórico registrar O QUE saiu (liquidez por modelo).
  veiculo: string | null;
  versao: string | null;
  ano: string | null;
  estado: string | null;
  fipe_codigo: string | null;
  data_publicacao_origem: string | null;
  ultimo_visto: string | null;
  link_origem?: string | null;
}

/**
 * Grandes frotistas (Localiza/Movida/Unidas etc.) permitem que cada loja da
 * rede publique o mesmo veículo na OLX — mesmo título e KM, anúncios
 * diferentes. Aqui isso é tratado como duplicata de rede: busca a oferta já
 * salva mais barata para o mesmo (veiculo, km), independente do status
 * (mesmo aprovada/enviada/favoritada — a base não pode mostrar o mesmo
 * carro repetido para quem está pesquisando).
 */
export async function buscarDuplicataPorTituloEKm(
  veiculo: string,
  km: number
): Promise<OportunidadeDuplicada | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, preco, origem_tipo, fonte, classificacao, margem_percentual, status, data_captura, veiculo, versao, ano, estado, fipe_codigo, data_publicacao_origem, ultimo_visto"
    )
    .eq("veiculo", veiculo)
    .eq("km", km)
    .order("preco", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar duplicata por título+km: ${error.message}`);
  }

  return data;
}

/**
 * Duplicata NO FACEBOOK: a mesma loja (ou multi-conta) republica o MESMO carro em
 * vários anúncios/perfis — links diferentes, produto idêntico (visto ao vivo: 4× o
 * mesmo Citroën C3, mesmo preço, mesma cidade, captados em 30s).
 *
 * ★ CHAVE = veículo + preço + CIDADE (SEM KM). Distinção decidida com o user (17/07):
 *  - OLX/Webmotors = lojas sérias em REGIÕES diferentes → KM separa carros reais (mesma
 *    rede, mesmo modelo/preço, KM diferente = carros diferentes). Lá a chave é título+KM.
 *  - Facebook = a MESMA loja pulveriza anúncios na MESMA cidade. O KM é lixo frequente e
 *    VARIA por digitação entre os perfis (visto: Uno 130000/126000, Ka 165000/190000, o
 *    mesmo carro). Incluir KM DEIXAVA PASSAR essas republicações. Trocado por CIDADE:
 *    mesmo modelo+preço exato+cidade = mesmo carro. Mais rígido, casa o padrão do FB.
 *  - Trade-off aceito pelo user: na pior hipótese funde dois carros iguais-modelo-preço-
 *    cidade que sejam distintos (raro; o preço EXATO discrimina). Precisão da vitrine >
 *    recall — republicação visível é pior que perder 1 carro ocasional. Sem cidade no
 *    anúncio → a chave NÃO aplica (o chamador deixa passar; não funde às cegas).
 *
 * PRESERVA O EXISTENTE: retorna o anúncio já salvo com essa identidade (o mais antigo).
 * O chamador descarta o NOVO. Em tempo real o novo é sempre "descoberta", então nunca
 * desbanca um aprovado/compartilhado que já esteja na plataforma.
 */
export async function buscarDuplicataFacebook(
  veiculo: string,
  preco: number,
  cidade: string
): Promise<OportunidadeDuplicada | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, preco, origem_tipo, fonte, classificacao, margem_percentual, status, data_captura, veiculo, versao, ano, estado, fipe_codigo, data_publicacao_origem, ultimo_visto, link_origem"
    )
    .eq("veiculo", veiculo)
    .eq("preco", preco)
    .eq("cidade", cidade)
    .order("data_captura", { ascending: true }) // o mais ANTIGO = o que já está na plataforma
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar duplicata FB (veículo+preço+cidade): ${error.message}`);
  }
  return data;
}

/** Move a duplicata pro histórico (mesma convenção do painel admin) e apaga. */
export async function apagarOportunidadeDuplicada(oportunidade: OportunidadeDuplicada): Promise<void> {
  const { error: erroHistorico } = await supabase.from("oportunidades_historico").insert({
    origem_tipo: oportunidade.origem_tipo,
    fonte: oportunidade.fonte,
    classificacao: oportunidade.classificacao,
    margem_percentual: oportunidade.margem_percentual,
    status: oportunidade.status,
    data_captura: oportunidade.data_captura,
    veiculo: oportunidade.veiculo,
    versao: oportunidade.versao,
    ano: oportunidade.ano,
    estado: oportunidade.estado,
    preco: oportunidade.preco,
    fipe_codigo: oportunidade.fipe_codigo,
    data_publicacao_origem: oportunidade.data_publicacao_origem,
    ultimo_visto: oportunidade.ultimo_visto,
    motivo: "duplicata", // NÃO é liquidez (é o mesmo carro repetido na rede de frotistas)
  });
  if (erroHistorico) {
    throw new Error(`Falha ao registrar histórico da duplicata "${oportunidade.id}": ${erroHistorico.message}`);
  }

  const { error: erroExclusao } = await supabase.from("opportunities").delete().eq("id", oportunidade.id);
  if (erroExclusao) {
    throw new Error(`Falha ao apagar duplicata "${oportunidade.id}": ${erroExclusao.message}`);
  }
}

/**
 * Garante que (cidade, estado) tem uma linha em cidades_coordenadas — base
 * pra "ordenar por proximidade" na vitrine pública (ver migration 0017 e
 * função SQL oportunidades_por_proximidade). Roda em toda oportunidade nova
 * elegível; é barato (uma consulta indexada) e idempotente, então não
 * precisa de um backfill em lote separado pra cidades novas. Sem coordenada
 * conhecida pro nome exato vindo da OLX (ex.: bairro/distrito que a OLX
 * trata como "cidade"), só loga e segue — essa oportunidade fica sem
 * distância calculada até alguém cadastrar a coordenada manualmente.
 */
export async function garantirCoordenadasCidade(cidade: string, estado: string): Promise<void> {
  const { data: existente, error: erroConsulta } = await supabase
    .from("cidades_coordenadas")
    .select("id")
    .eq("cidade", cidade)
    .eq("estado", estado)
    .maybeSingle();

  if (erroConsulta) {
    console.warn(`[geocoding] Falha ao consultar coordenadas de "${cidade}/${estado}": ${erroConsulta.message}`);
    return;
  }
  if (existente) return;

  const coordenadas = buscarCoordenadasCidade(cidade, estado);
  if (!coordenadas) {
    console.warn(`[geocoding] Sem coordenada conhecida pra "${cidade}/${estado}".`);
    return;
  }

  const { error: erroInsercao } = await supabase.from("cidades_coordenadas").upsert(
    { cidade, estado, latitude: coordenadas.latitude, longitude: coordenadas.longitude },
    { onConflict: "cidade,estado" }
  );
  if (erroInsercao) {
    console.warn(`[geocoding] Falha ao salvar coordenadas de "${cidade}/${estado}": ${erroInsercao.message}`);
  }
}

export interface VistoML {
  mlb_id: string;
  motivo: string;
  ultimo_preco: number | null;
}

/**
 * Livro-razão de vistos do ML: busca em LOTE (1 query por página) os anúncios
 * já processados-e-não-salvos, por mlb_id. Retorna um mapa pra decisão O(1) por
 * card. Falha vira mapa vazio (nunca derruba a varredura — no pior caso reprocessa).
 */
export async function buscarVistosML(mlbIds: string[]): Promise<Map<string, VistoML>> {
  const mapa = new Map<string, VistoML>();
  if (mlbIds.length === 0) return mapa;
  const { data, error } = await supabase.from("ml_vistos").select("mlb_id, motivo, ultimo_preco").in("mlb_id", mlbIds);
  if (error) {
    console.warn(`[ml_vistos] consulta em lote falhou: ${error.message}`);
    return mapa;
  }
  for (const v of data ?? []) mapa.set(v.mlb_id, v as VistoML);
  return mapa;
}

/** Registra/atualiza um anúncio NÃO salvo no livro-razão (descarte estrutural/margem). */
export async function registrarVistoML(mlbId: string, motivo: string, ultimoPreco: number | null): Promise<void> {
  const { error } = await supabase
    .from("ml_vistos")
    .upsert({ mlb_id: mlbId, motivo, ultimo_preco: ultimoPreco, atualizado_em: new Date().toISOString() }, { onConflict: "mlb_id" });
  if (error) console.warn(`[ml_vistos] upsert ${mlbId} falhou: ${error.message}`);
}

/** Facebook: dos IDs dados, quais já processamos (fb_vistos). Batch (1 query). */
export async function buscarIdsVistosFacebook(ids: string[]): Promise<Set<string>> {
  const vistos = new Set<string>();
  if (ids.length === 0) return vistos;
  const { data, error } = await supabase.from("fb_vistos").select("item_id").in("item_id", ids);
  if (error) {
    console.warn(`[fb_vistos] consulta em lote falhou: ${error.message}`);
    return vistos;
  }
  for (const r of data ?? []) vistos.add(r.item_id);
  return vistos;
}

/** Facebook: marca um anúncio como processado (salvo/isca/sem_motor/sem_fipe/acima_fipe). */
export async function registrarVistoFacebook(itemId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("fb_vistos")
    .upsert({ item_id: itemId, status, visto_em: new Date().toISOString() }, { onConflict: "item_id" });
  if (error) console.warn(`[fb_vistos] upsert ${itemId} falhou: ${error.message}`);
}

export async function linkOrigemJaExiste(linkOrigem: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id")
    .eq("link_origem", linkOrigem)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar oportunidade existente: ${error.message}`);
  }

  return data !== null;
}

/**
 * Epoch (segundos) do anúncio mais recente já alcançado numa varredura
 * anterior dessa categoria, usado como referência de parada da varredura
 * incremental (em vez de "já existe no banco" — ver migration 0010).
 */
export async function obterCheckpoint(categoriaUrl: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("discovery_checkpoints")
    .select("ultimo_anuncio_em")
    .eq("categoria_url", categoriaUrl)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar checkpoint de descoberta: ${error.message}`);
  }

  return data ? Math.floor(new Date(data.ultimo_anuncio_em).getTime() / 1000) : null;
}

/** Nunca regride o checkpoint — só avança se o novo valor for mais recente. */
export async function avancarCheckpoint(categoriaUrl: string, epochSegundos: number): Promise<void> {
  const checkpointAtual = await obterCheckpoint(categoriaUrl);
  if (checkpointAtual !== null && epochSegundos <= checkpointAtual) {
    return;
  }

  const { error } = await supabase.from("discovery_checkpoints").upsert(
    {
      categoria_url: categoriaUrl,
      ultimo_anuncio_em: new Date(epochSegundos * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "categoria_url" }
  );

  if (error) {
    throw new Error(`Falha ao avançar checkpoint de descoberta: ${error.message}`);
  }
}

/**
 * Config do worker editável pelo painel admin (tabela worker_config), com
 * fallback pro valor padrão de hoje (env var/constante) quando a chave
 * ainda não foi configurada pelo painel.
 */
export async function lerConfig(chave: string): Promise<string | null> {
  const { data, error } = await supabase.from("worker_config").select("valor").eq("chave", chave).maybeSingle();

  if (error) {
    throw new Error(`Falha ao ler config "${chave}": ${error.message}`);
  }

  // "" (campo limpo no painel admin) precisa cair no fallback igual a
  // null/undefined — só usar "??" aqui deixava "" passar como valor válido,
  // e Number("") é 0, não o padrão esperado (causou MAX_PAGINAS=0 silencioso
  // em 28/06, zerando a varredura da OLX sem nenhum erro nos logs).
  return data?.valor || null;
}

export interface ResultadoVarreduraRegistro {
  novos: number;
  elegiveis: number;
  descartados: number;
  semFipe: number;
}

/** Abre o registro de uma varredura em discovery_runs, retorna o id da linha. */
export async function iniciarRegistroVarredura(categoriaUrl: string, modo: string): Promise<string> {
  const { data, error } = await supabase
    .from("discovery_runs")
    .insert({ categoria_url: categoriaUrl, modo, status: "em_andamento" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Falha ao registrar início de varredura: ${error.message}`);
  }

  return data.id as string;
}

/** Fecha o registro de uma varredura como sucesso, com os contadores finais. */
export async function finalizarRegistroVarreduraComSucesso(
  id: string,
  resultado: ResultadoVarreduraRegistro,
  observacao?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("discovery_runs")
    .update({
      status: "sucesso",
      finalizado_em: new Date().toISOString(),
      novos: resultado.novos,
      elegiveis: resultado.elegiveis,
      descartados: resultado.descartados,
      sem_fipe: resultado.semFipe,
      observacao: observacao ?? null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao finalizar registro de varredura: ${error.message}`);
  }
}

/** Fecha o registro de uma varredura como erro, guardando a mensagem da falha. */
export async function finalizarRegistroVarreduraComErro(id: string, erroMensagem: string): Promise<void> {
  const { error } = await supabase
    .from("discovery_runs")
    .update({ status: "erro", finalizado_em: new Date().toISOString(), erro_mensagem: erroMensagem })
    .eq("id", id);

  if (error) {
    throw new Error(`Falha ao registrar erro da varredura: ${error.message}`);
  }
}

/**
 * Registra um REINÍCIO DE ROTEADOR como uma linha própria em discovery_runs, pra
 * ele aparecer na TIMELINE do painel de varredura (aba ML) na ordem cronológica,
 * entre os runs bloqueados que o motivaram. Assim o admin distingue "internet caiu
 * porque NÓS reiniciamos o roteador" de uma queda real de internet. Ver
 * project_repasse_livre_ml_fichamento_ip_visibilidade e a memória do auto-reboot.
 *
 * - categoria_url casa `%mercadoli%` (o painel filtra a aba ML por esse padrão) e
 *   modo="reinicio-roteador" (o PainelWorker renderiza a linha destacada).
 * - status sucesso/erro conforme o reboot; a mensagem NÃO contém "BLOQUEADO" de
 *   propósito, pra não ser contada como bloqueio de ML pelo gatilho de auto-reboot.
 * - iniciado_em = finalizado_em = agora (evento instantâneo, não uma varredura).
 * Best-effort no chamador: registrar isto nunca pode derrubar o worker.
 */
export async function registrarEventoReinicioRoteador(
  sucesso: boolean,
  bloqueios: number,
  detalhe: string,
  ipAntes?: string | null,
): Promise<void> {
  const agora = new Date().toISOString();
  const contexto = `${bloqueios} bloqueio(s) seguido(s) do ML${ipAntes ? ` · IP anterior ${ipAntes}` : ""}`;
  const mensagem = sucesso
    ? `🔄 Roteador reiniciado automaticamente (${contexto}). A internet caiu ~1-5 min — NÃO foi queda real. O IP deve ter trocado.`
    : `🔄 Tentativa de reinício do roteador FALHOU: ${detalhe} (${contexto}).`;

  const { error } = await supabase.from("discovery_runs").insert({
    categoria_url: "mercadolivre :: reinicio-roteador",
    modo: "reinicio-roteador",
    status: sucesso ? "sucesso" : "erro",
    iniciado_em: agora,
    finalizado_em: agora,
    // Sucesso vai em `observacao` (o painel mostra); falha em `erro_mensagem`.
    observacao: sucesso ? mensagem : null,
    erro_mensagem: sucesso ? null : mensagem,
  });
  if (error) {
    // Só loga — é um registro de visibilidade, não pode quebrar nada.
    console.error("[auto-roteador] falha ao registrar evento de reinício:", error.message);
  }
}

/**
 * Grava o snapshot_id do Bright Data no run — chamado assim que o snapshot é
 * DISPARADO (antes do download), pra sobreviver a falha de download/processo
 * morto e permitir a recuperação em 1 clique. Não derruba o run se falhar
 * (é metadado de recuperação, não bloqueia a varredura em si).
 */
export async function registrarSnapshotIdVarredura(id: string, snapshotId: string): Promise<void> {
  const { error } = await supabase.from("discovery_runs").update({ snapshot_id: snapshotId }).eq("id", id);
  if (error) {
    console.warn(`[varredura] não consegui gravar snapshot_id no run ${id}: ${error.message}`);
  }
}

/**
 * Faxina de runs zumbis: marca como "erro" (timeout) os que ficaram presos em
 * "em_andamento" além do limite — processos mortos no meio (proxy travado,
 * container reiniciado) que nunca finalizaram. Roda no início de cada varredura.
 * Preserva snapshot_id → um Webmotors preso segue recuperável (recuperar:snapshots).
 * Limite folgado (2h): nenhuma varredura legítima passa disso (a maior ~54min).
 */
export async function finalizarRunsPresosComoErro(horasLimite = 2): Promise<number> {
  const limite = new Date(Date.now() - horasLimite * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from("discovery_runs")
    .update({ status: "erro", finalizado_em: new Date().toISOString(), erro_mensagem: "timeout — run preso em em_andamento (finalizado pela faxina)" })
    .eq("status", "em_andamento")
    .lt("iniciado_em", limite)
    .select("id");
  if (error) {
    console.warn(`[varredura] faxina de runs presos falhou: ${error.message}`);
    return 0;
  }
  const n = data?.length ?? 0;
  if (n > 0) console.log(`[varredura] faxina: ${n} run(s) preso(s) marcado(s) como erro.`);
  return n;
}

/**
 * Salva um trecho de diagnóstico em worker_config (chave/valor), como os debugs
 * de webhook. Usado pra capturar o HTML quando o parser da OLX não acha os
 * anúncios — assim dá pra ver DAQUI se a OLX mudou o formato ou devolveu
 * página de bloqueio, sem depender do log da Railway. Nunca derruba o processo.
 */
export async function registrarDebugVarredura(chave: string, valor: string): Promise<void> {
  try {
    await supabase.from("worker_config").upsert({ chave, valor: valor.slice(0, 60_000) }, { onConflict: "chave" });
  } catch (e) {
    console.warn(`[varredura] não consegui gravar debug ${chave}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Runs da Webmotors que falharam (erro) ou travaram (em_andamento) mas têm o
 * snapshot_id salvo → recuperáveis sem re-pagar. Base do `recuperar:snapshots-
 * webmotors` sem argumentos (1 clique). Ver recuperarSnapshotsWebmotors.ts.
 */
export async function buscarRunsWebmotorsRecuperaveis(): Promise<{ id: string; snapshot_id: string }[]> {
  const { data, error } = await supabase
    .from("discovery_runs")
    .select("id, snapshot_id")
    .eq("modo", "webmotors")
    .in("status", ["erro", "em_andamento"])
    .not("snapshot_id", "is", null)
    .order("iniciado_em", { ascending: false });
  if (error) {
    throw new Error(`Falha ao buscar runs recuperáveis: ${error.message}`);
  }
  return (data ?? []) as { id: string; snapshot_id: string }[];
}

/** Marca um run como recuperado (sucesso) com os contadores da reingestão. */
export async function marcarVarreduraRecuperada(
  id: string,
  resultado: ResultadoVarreduraRegistro,
  snapshotId: string
): Promise<void> {
  const base = {
    status: "sucesso",
    finalizado_em: new Date().toISOString(),
    observacao: `Recuperado do snapshot ${snapshotId}.`,
  };
  // Só sobrescreve os contadores quando a reingestão REALMENTE salvou algo — assim
  // re-rodar a recuperação de um snapshot já recuperado (tudo dedupado → 0
  // elegíveis) não apaga os números verdadeiros da 1ª recuperação no histórico.
  const atualizacao =
    resultado.elegiveis > 0
      ? {
          ...base,
          novos: resultado.novos,
          elegiveis: resultado.elegiveis,
          descartados: resultado.descartados,
          sem_fipe: resultado.semFipe,
        }
      : base;

  const { error } = await supabase.from("discovery_runs").update(atualizacao).eq("id", id);
  if (error) {
    throw new Error(`Falha ao marcar varredura recuperada: ${error.message}`);
  }
}
