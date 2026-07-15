/**
 * Facebook Marketplace — extrator de anúncio de veículo (parser PURO, sem rede,
 * testável contra HTML salvo). Recon 14/07 (ver project_repasse_livre_facebook_
 * marketplace_motor_descoberta) descobriu:
 *
 * 1. O HTML (SEM login) traz um Relay JSON com o anúncio principal + ~20 relacionados.
 *    - `vehicle_*` e `redacted_description` são ÚNICOS do principal (1x) → first-match confiável.
 *    - `listing_price`/`marketplace_listing_title` aparecem p/ TODOS (21x) → NÃO usar first-match;
 *      ancorar no bloco do `redacted_description` (o nó do anúncio principal).
 * 2. Campos estruturados `vehicle_make/model/...` são INCONSISTENTES (alguns vendedores
 *    digitam tudo no título livre) → o TÍTULO é a fonte primária; estruturado é bônus.
 * 3. ★ PREÇO É O PROBLEMA: `listing_price` frequentemente é ISCA/ENTRADA do lojista
 *    (ex.: HB20S 2014 com "preço" R$14.900 mas R$55.900 na descrição + "financiamento 60x").
 *    → o preço do campo NÃO é confiável p/ margem. Guardamos os R$ da descrição como
 *    candidatos e sinalizamos suspeita de isca (POLÍTICA a definir com o usuário).
 * 4. Motor/versão (1.0/1.3/1.4/1.6/1.8/2.0...) sai do TÍTULO (quase sempre) ou descrição.
 *    Sem motor claro → DESCARTA (regra do usuário: melhor pular que chutar a FIPE).
 */

export interface AnuncioFacebook {
  id: string;
  titulo: string;
  marca: string | null;
  modelo: string | null;
  ano: string | null;
  motor: string | null; // "1.0" | "1.6" ...  (discriminador da FIPE) — melhor candidato
  motorCandidatos: Array<{ motor: string; fonte: string }>; // todos os achados + de onde (transparência)
  versaoTexto: string | null; // texto mais rico de versão/trim p/ o fuzzy da FIPE
  combustivel: string | null; // FLEX | GASOLINE | DIESEL ...
  cambio: string | null; // MANUAL | AUTOMATIC ...
  km: number | null;
  sellerType: string | null; // PRIVATE_SELLER | DEALER (gameável — descrição revela loja)
  precoCampo: number | null; // listing_price do FB (pode ser ISCA/entrada!)
  precosDescricao: number[]; // R$ achados na descrição (candidatos ao preço real)
  cidade: string | null;
  estado: string | null;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  fotoPrincipal: string | null;
  fotos: string[]; // TODAS as fotos do anúncio (até 10), como ML/OLX
  leilao: "Sim" | "Não" | null; // procedência de leilão extraída da DESCRIÇÃO (FB não tem atributo)
  suspeitaIsca: boolean; // descrição tem cara de financiamento/entrada de loja
}

/**
 * Procedência de LEILÃO na descrição do FB (que NÃO tem o atributo estruturado dos outros
 * marketplaces). Análise do ENTORNO da palavra (pedido do user): recorta a cláusula que contém
 * "leilão" e checa NEGAÇÃO nela. "teve passagem pelo leilão"/"tem leilão"/"possui leilão" → "Sim";
 * "NÃO tem passagem por leilão"/"sem leilão"/"isento de leilão" → "Não"; não mencionou → null.
 * Qualquer menção AFIRMATIVA vence (sinaliza leilão). Vira atributos_olx.has_auction (Copiloto/BIA leem).
 */
export function detectarLeilao(texto: string | null): "Sim" | "Não" | null {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const re = /\bleil[ãa]o\w*/g;
  let m: RegExpExecArray | null;
  let positivo = false;
  let negativo = false;
  while ((m = re.exec(t)) !== null) {
    // Cláusula da palavra: janela anterior recortada no separador mais próximo (o FB usa "|" nas quebras).
    let janela = t.slice(Math.max(0, m.index - 45), m.index);
    const sep = Math.max(janela.lastIndexOf("."), janela.lastIndexOf("|"), janela.lastIndexOf("!"), janela.lastIndexOf("?"), janela.lastIndexOf(";"), janela.lastIndexOf("•"), janela.lastIndexOf("✅"), janela.lastIndexOf("➡"));
    if (sep >= 0) janela = janela.slice(sep + 1);
    if (/\b(n[ãa]o|sem|nunca|jamais|isento|livre de)\b/.test(janela) || /\bs\/\s*$/.test(janela)) negativo = true;
    else positivo = true;
  }
  if (positivo) return "Sim";
  if (negativo) return "Não";
  return null;
}

/** minúsculas + sem acento, pra casar frase livre do vendedor. */
function semAcento(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * DOCUMENTAÇÃO DE RISCO na descrição do FB → descarte (procedência insegura). Termos
 * validados pelo user (caso Picasso): "sem documento" / "passo sem compromisso" /
 * "só documento de roda". Carro sem documentação/transferência não é oportunidade
 * séria nem com margem boa. Os demais termos do anúncio (QUITADA, NÃO CONHEÇO EX DONO)
 * são imprecisos demais → fora. FUTURO: virar sinal de procedência no Copiloto.
 */
const RISCO_DOC_RE = /\b(sem documento|passo sem compromisso|documento de roda|so documento|nao transfere|documento atrasado)\b/;
export function riscoDocumentacao(texto: string | null): boolean {
  return texto ? RISCO_DOC_RE.test(semAcento(texto)) : false;
}

/**
 * Preço-ISCA "de entrada": o valor ANUNCIADO aparece na descrição seguido de
 * "(de) entrada" → o preço é a ENTRADA de um financiamento, não o preço do carro
 * (o clássico "peço 16.900 de entrada resto direto comigo") → margem ilusória,
 * descarta. Só dispara quando o número ≈ o preço anunciado: uma "entrada de 8.000"
 * com preço real diferente NÃO conta (aí a entrada é só uma opção de pagamento).
 */
export function precoEhEntrada(descricao: string | null, preco: number | null): boolean {
  if (!descricao || !preco || preco <= 0) return false;
  const t = semAcento(descricao);
  const re = /(\d[\d.\s]{2,}\d)\s*(?:reais\s*)?(?:de\s+)?entrada/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const val = Number(m[1].replace(/[.\s]/g, ""));
    if (Number.isFinite(val) && Math.abs(val - preco) <= Math.max(100, preco * 0.03)) return true;
  }
  return false;
}

function titlecase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Câmbio cru do FB (MANUAL/AUTOMATIC/CVT…, uppercase inglês) → padrão canônico da plataforma
 *  ("Manual"/"Automático", como OLX/ML), pra bater com a ficha e os filtros das outras fontes. */
const CAMBIO_FB: Record<string, string> = {
  MANUAL: "Manual",
  AUTOMATIC: "Automático",
  AUTOMATED_MANUAL: "Automatizado",
  CVT: "Automático",
  SEMI_AUTOMATIC: "Semi-Automático",
  SEMIAUTOMATIC: "Semi-Automático",
  DUAL_CLUTCH: "Automático",
  TIPTRONIC: "Automático",
};
function normalizarCambio(raw: string | null): string | null {
  if (!raw) return null;
  const k = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return CAMBIO_FB[k] ?? titlecase(raw);
}

/**
 * Padroniza o título no NOSSO formato "Marca Modelo Ano Versão" (o FB vem cru como
 * "Ano Marca Modelo" e o modelo é texto livre do vendedor → sem padrão). Também conserta
 * a extração de marca/modelo p/ BI/SEO/slug (que lê as 2 primeiras palavras do `veiculo`;
 * o título cru começava pelo ANO). Sem marca → devolve "" (o chamador mantém o cru).
 */
// Emoji/pictogramas + separadores decorativos que o vendedor joga no título.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE00}-\u{FE0F}‍]/gu;
// Ruído de marketing (não é versão de carro) — corta o título aqui pra frente.
const RUIDO_TITULO = /^(excelente|oportunidade|abaixo|acima|fipe|aceito|aceita|financiamento|financia\w*|parcela\w*|entrada|troca|troco|whatsapp|contato|urgente|repasse|oferta|promo\w*|imperd\w*|seminovo|impec\w*|conservad\w*|leia|obs|barbada|imperdivel|ligue|chama)$/i;

function limparTexto(s: string): string {
  return s.replace(EMOJI_RE, " ").replace(/[–—•|/\\!?¡¿,;:*#~"']+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Padroniza o título no NOSSO formato "Marca Modelo Ano Versão". FB vem cru ("Ano Marca Modelo"),
 * o modelo é texto livre e vendedores despejam EMOJI + marketing ("Excelente Oportunidade, Abaixo
 * Da Fipe!"). Aqui: tira emoji/separadores, corta no 1º token de ruído de marketing e limita a
 * versão a poucas palavras — a vitrine fica padronizada mesmo com o FB bagunçado. Sem marca → "".
 */
export function montarVeiculoPadrao(a: AnuncioFacebook): string {
  if (!a.marca) return "";
  const marca = titlecase(limparTexto(a.marca));
  let modelo = limparTexto(a.modelo ?? "").replace(/\b(19|20)\d{2}\b/g, " ").replace(/\s+/g, " ").trim();
  if (marca && modelo.toLowerCase().startsWith(marca.toLowerCase())) modelo = modelo.slice(marca.length).trim();
  const palavras = modelo.split(" ").filter(Boolean);
  const corte = palavras.findIndex((w) => RUIDO_TITULO.test(w.replace(/[^\p{L}0-9.]/gu, "")));
  const uteis = (corte >= 0 ? palavras.slice(0, corte) : palavras).slice(0, 5); // versão curta, sem marketing
  const modeloBase = uteis[0] ? titlecase(uteis[0]) : "";
  let versao = uteis.slice(1).join(" ");
  if (a.motor && !new RegExp(`\\b${a.motor.replace(".", "\\.")}\\b`).test(versao)) versao = `${versao} ${a.motor}`.trim();
  return [marca, modeloBase, a.ano, titlecase(versao)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** Filtros globais de captação do FB (vêm do painel "Motor de Busca" via worker_config). */
export interface FiltrosFacebook {
  minPreco: string;
  maxPreco: string;
  minAno: string;
  sort: string; // creation_time_descend | best_match | price_ascend | distance_ascend
}

/**
 * Compõe a URL final = URL-base da região + RAIO (por região) + filtros globais (preço/ano/ordem).
 * MESMA composição da prévia do painel (PainelMotorBusca). O `raio` é campo do painel (o FB prioriza
 * o CENTRO e abre por escassez → raio menor + vários centros cobre melhor que um centro gigante).
 * Sobrescreve qualquer `radius=` que venha colado na URL. minPrice tira velharia+isca; minYear corta
 * ônibus/motorhome; sortBy prioriza fresco.
 */
export function montarUrlBuscaFacebook(urlBase: string, f: FiltrosFacebook, raio = "250"): string {
  const base = urlBase
    .trim()
    .replace(/([?&])radius=\d+/i, "$1")
    .replace(/&{2,}/g, "&")
    .replace(/[?&]$/, "");
  const sep = base.includes("?") ? "&" : "?";
  const p = new URLSearchParams({
    radius: raio,
    minPrice: f.minPreco,
    maxPrice: f.maxPreco,
    minYear: f.minAno,
    sortBy: f.sort,
    topLevelVehicleType: "car_truck",
  });
  return `${base}${sep}${p.toString()}`;
}

/**
 * Extrai os IDs de anúncio de uma página de BUSCA do FB Marketplace (fetch puro,
 * headers de Chrome → HTTP 200 com o JSON). Cada card é
 * `"listing":{"__typename":"GroupCommerceProductItem","id":"<id>"...}`. Validado:
 * o id casa com a URL /marketplace/item/<id>. Paginação (scroll) = cursor do GraphQL
 * (v2); por ora, a página inicial + espalhar por região/rodar frequente já cobre bem.
 */
export function extrairIdsDaBusca(html: string): string[] {
  const re = /"listing":\{"__typename":"GroupCommerceProductItem","id":"(\d{6,})"/g;
  return [...new Set([...html.matchAll(re)].map((m) => m[1]))];
}

/** Cursor de próxima página da busca (GraphQL), quando houver — p/ paginação futura. */
export function cursorDaBusca(html: string): string | null {
  return (html.match(/"end_cursor":"([^"]+)"/) || [])[1] ?? null;
}

export interface ResultadoParseFacebook {
  anuncio: AnuncioFacebook | null;
  descartar: boolean;
  motivoDescarte?: "sem_motor" | "sem_titulo" | "nao_eh_veiculo" | "isca_loja";
}

const MOTOR_RE = /\b([0-9]\.[0-9])\b/;
const ANO_RE = /\b(19[89]\d|20[0-4]\d)\b/;
// Sinais de anúncio de LOJA/ISCA (preço-campo = entrada, não o carro). Cada regex = 1 sinal;
// exigimos 2+ pra marcar como loja — assim um particular que só cita "aceito financiamento"
// não é derrubado, mas o discurso clássico de loja (entrada + Nx + banco + aprovação) cai.
const SINAIS_LOJA: RegExp[] = [
  /financiament|financ\b/i,
  /pequenas? entradas?|entrada (m[íi]nima|sugerida|facilitada|parcelada)/i,
  /\b\d{1,3}\s?x\b|parcela|presta[çc]/i,
  /aprova[çc]|cr[ée]dito aprovado|score/i,
  /banco|caixa|itau|bradesco|santander|financeira/i,
  /comprova[çc]|renda|cnh|aposentad/i,
  /cons[óo]rcio/i,
  /nossa loja|showroom|estoque|confira nossos|whatsapp da loja/i,
];
function contarSinaisLoja(texto: string | null): number {
  if (!texto) return 0;
  return SINAIS_LOJA.reduce((n, re) => n + (re.test(texto) ? 1 : 0), 0);
}

/** Decodifica escapes JSON (\uXXXX, \n, \/, \") E entidades HTML (&#xNN; &#NN; &amp;…) —
 *  o JSON embutido usa \u, mas as meta og: usam entidades HTML (ex.: "b&#xe1;sico"). */
function decodar(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\n/g, " ")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** first-match de "chave":"valor" no HTML todo (só p/ campos ÚNICOS do principal). */
function campoUnico(html: string, chave: string): string | null {
  const m = html.match(new RegExp(`"${chave}":"([^"]*)"`));
  return m ? decodar(m[1]) : null;
}

/** meta og: do <head> (sempre do anúncio principal) — já decodificado. */
function ogMeta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta property="og:${prop}"[^>]*content="([^"]*)"`));
  return m ? decodar(m[1]) : null;
}

/** Ano do texto: 4 dígitos (1990-2049); senão 2 dígitos ("ano 98", "98/99") com inferência
 *  de século (>=30 → 19xx, senão 20xx). Retorna "YYYY" ou null. */
function extrairAno(texto: string): string | null {
  const quatro = texto.match(ANO_RE)?.[1];
  if (quatro) return quatro;
  const dois = texto.match(/\bano\s*(\d{2})\b/i)?.[1] ?? texto.match(/\b(\d{2})[\/.](\d{2})\b/)?.[1];
  if (dois) return (Number(dois) >= 30 ? "19" : "20") + dois;
  return null;
}

/** Extrai marca+modelo+ano do título quando o estruturado não veio.
 *  Título FB típico: "{ANO} {MARCA} {MODELO...}" (ex "2014 Renault Clio"). */
function parsearTitulo(titulo: string): { marca: string | null; modelo: string | null; ano: string | null } {
  const ano = extrairAno(titulo);
  // tira o ano e limpa; 1ª palavra = marca, resto = modelo (mesma heurística do ML/OLX)
  const semAno = titulo.replace(ANO_RE, " ").replace(/\s+/g, " ").trim();
  const partes = semAno.split(" ").filter(Boolean);
  const marca = partes[0] ?? null;
  const modelo = partes.slice(1).join(" ") || null;
  return { marca, modelo, ano };
}

/**
 * Parseia o HTML de um anúncio do FB Marketplace. `itemId` = id da URL.
 * Retorna {anuncio, descartar}. Descarta se não achar motor/versão (regra do usuário).
 */
export function extrairAnuncioFacebook(html: string, itemId: string): ResultadoParseFacebook {
  // Título/descrição vêm do og: (sempre do principal) com fallback no Relay.
  const titulo = ogMeta(html, "title") ?? campoUnicoAncorado(html, "marketplace_listing_title");
  if (!titulo) return { anuncio: null, descartar: true, motivoDescarte: "sem_titulo" };

  // Preço do campo: ANCORADO no bloco do redacted_description (nó do principal),
  // NUNCA first-match (colide com os relacionados).
  const precoCampo = precoAncorado(html);

  // Estruturados (únicos do principal; podem faltar → título cobre).
  const marcaEstr = campoUnico(html, "vehicle_make_display_name");
  const modeloEstr = campoUnico(html, "vehicle_model_display_name");
  const combustivel = campoUnico(html, "vehicle_fuel_type");
  const cambio = normalizarCambio(campoUnico(html, "vehicle_transmission_type"));
  const sellerType = campoUnico(html, "vehicle_seller_type");
  const odo = html.match(/"vehicle_odometer_data":\{"unit":"\w+","value":(\d+)/);
  const km = odo ? Number(odo[1]) : null;

  // Descrição (redacted_description do principal, ou og:description).
  const descricao = descricaoDoPrincipal(html) ?? (ogMeta(html, "description") ?? null);

  // Se não tem NENHUM sinal de veículo (sem marca estruturada e título sem cara de carro), não é veículo.
  const pTit = parsearTitulo(titulo);
  const marca = marcaEstr ?? pTit.marca;
  const modelo = modeloEstr ?? pTit.modelo;
  const ano = pTit.ano ?? (descricao ? extrairAno(descricao) : null);

  // ★ NÃO HÁ PADRÃO: cada vendedor põe a versão num lugar (título, descrição, campo modelo,
  // trim estruturado, specs). Caçamos o MOTOR/versão em TODAS as frentes e combinamos.
  const trimEstr = campoUnico(html, "vehicle_trim_display_name");
  const engineSize = normalizarEngineSize(html.match(/"engine_size":"?([\d.]+)"?/)?.[1] ?? null);
  const fontesMotor: Array<[string, string | null]> = [
    ["engine_size", engineSize], // specs estruturadas (quando houver) — mais confiável
    ["titulo", titulo],
    ["trim", trimEstr],
    ["modelo", modeloEstr], // às vezes carrega o motor: "meriva premium 1.8 flex"
    ["descricao", descricao],
  ];
  const motorCandidatos: Array<{ motor: string; fonte: string }> = [];
  for (const [fonte, txt] of fontesMotor) {
    if (!txt) continue;
    for (const m of txt.matchAll(/\b([0-9]\.[0-9])\b/g)) motorCandidatos.push({ motor: m[1], fonte });
  }
  const motor = escolherMotor(motorCandidatos);
  // Sem motor em NENHUMA frente → descarta (regra do usuário: melhor pular que chutar a FIPE).
  if (!motor) return { anuncio: null, descartar: true, motivoDescarte: "sem_motor" };

  // Texto de versão mais rico p/ o fuzzy da FIPE (trim estruturado > modelo digitado > título).
  const versaoTexto = trimEstr ?? modeloEstr ?? parsearTitulo(titulo).modelo;

  // Preços na descrição (candidatos ao preço REAL; o campo pode ser isca).
  const precosDescricao = [...(descricao ?? "").matchAll(/R\$\s?([\d.]{3,})/g)]
    .map((m) => Number(m[1].replace(/\./g, "")))
    .filter((n) => n >= 1000 && n <= 2_000_000);

  // Localização também ancorada no bloco do principal (senão first-match pega de relacionado).
  const janLoc = janelaPrincipal(html);
  const loc = janLoc.match(/"reverse_geocode":\{"city":"([^"]+)","state":"([^"]+)"/);
  const ll = janLoc.match(/"latitude":([\-\d.]+),"longitude":([\-\d.]+)/);

  // Loja/isca: 2+ sinais de discurso de loja no título+descrição (o preço-campo vira entrada).
  const suspeitaIsca = contarSinaisLoja(`${titulo} ${descricao ?? ""}`) >= 2;
  const fotos = extrairFotos(html);

  const anuncio: AnuncioFacebook = {
    id: itemId,
    titulo,
    marca,
    modelo,
    ano,
    motor,
    motorCandidatos,
    versaoTexto,
    combustivel,
    cambio,
    km,
    sellerType,
    precoCampo,
    precosDescricao,
    cidade: loc ? decodar(loc[1]) : null,
    estado: loc ? loc[2] : null,
    latitude: ll ? Number(ll[1]) : null,
    longitude: ll ? Number(ll[2]) : null,
    descricao,
    fotoPrincipal: fotos[0] ?? ogMeta(html, "image"),
    fotos: fotos.length > 0 ? fotos : ogMeta(html, "image") ? [ogMeta(html, "image")!] : [],
    leilao: detectarLeilao(descricao),
    suspeitaIsca,
  };

  // POLÍTICA DE PREÇO = (b): descartar LOJA/ISCA e focar em PARTICULAR genuíno. O preço-campo
  // do FB só é confiável no particular; na loja é entrada/isca. Retorna o anúncio junto (descartar
  // = true) pra o pipeline poder logar/auditar quantas iscas caíram. Ver gateway/facebook memória.
  if (suspeitaIsca) return { anuncio, descartar: true, motivoDescarte: "isca_loja" };

  return { anuncio, descartar: false };
}

/** Escolhe o motor por CONSENSO entre as frentes (o mais citado); empate → a 1ª frente
 *  (fontesMotor já vem em ordem de confiança: engine_size > título > trim > modelo > descrição). */
function escolherMotor(candidatos: Array<{ motor: string; fonte: string }>): string | null {
  if (candidatos.length === 0) return null;
  const freq = new Map<string, number>();
  for (const c of candidatos) freq.set(c.motor, (freq.get(c.motor) ?? 0) + 1);
  const max = Math.max(...freq.values());
  const maisCitados = [...freq.entries()].filter(([, n]) => n === max).map(([m]) => m);
  if (maisCitados.length === 1) return maisCitados[0];
  // empate → segue a ordem de confiança das frentes
  return candidatos.find((c) => maisCitados.includes(c.motor))!.motor;
}

/** engine_size das specs pode vir "1.6" (litros) ou "1600"/"999" (cc) → normaliza p/ "X.X". */
function normalizarEngineSize(v: string | null): string | null {
  if (!v) return null;
  if (/^[0-9]\.[0-9]$/.test(v)) return v;
  const cc = Number(v);
  if (cc >= 700 && cc <= 8000) return (Math.round(cc / 100) / 10).toFixed(1);
  return null;
}

/** Janela do anúncio PRINCIPAL: o nó do `redacted_description` é único do principal, então
 *  campos que colidem (preço/título/localização) são lidos AQUI, não por first-match global. */
function janelaPrincipal(html: string): string {
  const di = html.indexOf('"redacted_description"');
  return di === -1 ? html : html.slice(Math.max(0, di - 9000), di + 9000);
}

/** Preço do anúncio principal: ancorado na janela do `redacted_description`. */
function precoAncorado(html: string): number | null {
  const m = janelaPrincipal(html).match(/"listing_price":\{"amount":"([\d.]+)"/);
  return m ? Math.round(Number(m[1])) : null;
}

/** Título ancorado no bloco do principal (fallback quando não há og:title). */
function campoUnicoAncorado(html: string, chave: string): string | null {
  const m = janelaPrincipal(html).match(new RegExp(`"${chave}":"([^"]+)"`));
  return m ? decodar(m[1]) : null;
}

/** TODAS as fotos do anúncio (até 10). O array `listing_photos` é único do principal;
 *  cada entrada tem um `image.uri`. Bracket-match respeitando strings (o array é grande). */
function extrairFotos(html: string): string[] {
  const marca = '"listing_photos":[';
  const inicio = html.indexOf(marca);
  if (inicio === -1) return [];
  const s = html.slice(inicio + marca.length - 1); // começa no "["
  let prof = 0;
  let fim = -1;
  let emStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { emStr = !emStr; continue; }
    if (emStr) continue;
    if (c === "[") prof++;
    else if (c === "]") { prof--; if (prof === 0) { fim = i; break; } }
  }
  if (fim === -1) return [];
  const arr = s.slice(0, fim + 1);
  // SÓ fotos grandes (descarta miniatura): cada foto tem image {height,width,uri};
  // fica com as de lado >= 500px. FB serve o carrossel em ~720-960px.
  const fotos: string[] = [];
  for (const m of arr.matchAll(/"image":\{([^{}]*)\}/g)) {
    const bloco = m[1];
    const uri = bloco.match(/"uri":"([^"]+)"/)?.[1];
    const largura = Number(bloco.match(/"width":(\d+)/)?.[1] ?? 0);
    const altura = Number(bloco.match(/"height":(\d+)/)?.[1] ?? 0);
    if (uri && Math.max(largura, altura) >= 500) fotos.push(uri.replace(/\\\//g, "/"));
  }
  return [...new Set(fotos)].slice(0, 10);
}

/** Texto da descrição do anúncio principal. */
function descricaoDoPrincipal(html: string): string | null {
  const di = html.indexOf('"redacted_description":{"text":"');
  if (di === -1) return null;
  const raw = html.slice(di + 31, di + 31 + 4000);
  return decodar(raw.split('"},"')[0].replace(/"$/, ""));
}
