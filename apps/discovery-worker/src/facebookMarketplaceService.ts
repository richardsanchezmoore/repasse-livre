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
  motor: string | null; // "1.0" | "1.6" ...  (discriminador da FIPE)
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
  suspeitaIsca: boolean; // descrição tem cara de financiamento/entrada de loja
}

export interface ResultadoParseFacebook {
  anuncio: AnuncioFacebook | null;
  descartar: boolean;
  motivoDescarte?: "sem_motor" | "sem_titulo" | "nao_eh_veiculo";
}

const MOTOR_RE = /\b([0-9]\.[0-9])\b/;
const ANO_RE = /\b(19[89]\d|20[0-4]\d)\b/;
// Cara de anúncio de loja/isca (preço-campo = entrada, não o carro):
const ISCA_RE = /financiamento|entrada|parcel|\b\d{1,3}x\b|aprova|banco|renda|consórcio|pequenas entradas/i;

/** Decodifica escapes de string JSON embutida no HTML (\uXXXX, \n, \/, \"). */
function decodar(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
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

/** meta og: do <head> (sempre do anúncio principal). */
function ogMeta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta property="og:${prop}"[^>]*content="([^"]*)"`));
  return m ? m[1] : null;
}

/** Extrai marca+modelo+ano do título quando o estruturado não veio.
 *  Título FB típico: "{ANO} {MARCA} {MODELO...}" (ex "2014 Renault Clio"). */
function parsearTitulo(titulo: string): { marca: string | null; modelo: string | null; ano: string | null } {
  const ano = titulo.match(ANO_RE)?.[1] ?? null;
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
  const cambio = campoUnico(html, "vehicle_transmission_type");
  const sellerType = campoUnico(html, "vehicle_seller_type");
  const odo = html.match(/"vehicle_odometer_data":\{"unit":"\w+","value":(\d+)/);
  const km = odo ? Number(odo[1]) : null;

  // Descrição (redacted_description do principal, ou og:description).
  const descricao = descricaoDoPrincipal(html) ?? (ogMeta(html, "description") ?? null);

  // Se não tem NENHUM sinal de veículo (sem marca estruturada e título sem cara de carro), não é veículo.
  const pTit = parsearTitulo(titulo);
  const marca = marcaEstr ?? pTit.marca;
  const modelo = modeloEstr ?? pTit.modelo;
  const ano = pTit.ano ?? (descricao ? descricao.match(ANO_RE)?.[1] ?? null : null);

  // MOTOR/VERSÃO: título primeiro, descrição depois. Sem motor → descarta.
  const motor = titulo.match(MOTOR_RE)?.[1] ?? (descricao ? descricao.match(MOTOR_RE)?.[1] ?? null : null);
  if (!motor) return { anuncio: null, descartar: true, motivoDescarte: "sem_motor" };

  // Preços na descrição (candidatos ao preço REAL; o campo pode ser isca).
  const precosDescricao = [...(descricao ?? "").matchAll(/R\$\s?([\d.]{3,})/g)]
    .map((m) => Number(m[1].replace(/\./g, "")))
    .filter((n) => n >= 1000 && n <= 2_000_000);

  const loc = html.match(/"reverse_geocode":\{"city":"([^"]+)","state":"([^"]+)"/);
  const ll = html.match(/"latitude":([\-\d.]+),"longitude":([\-\d.]+)/);

  const suspeitaIsca = Boolean(descricao && ISCA_RE.test(descricao));

  const anuncio: AnuncioFacebook = {
    id: itemId,
    titulo,
    marca,
    modelo,
    ano,
    motor,
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
    fotoPrincipal: ogMeta(html, "image"),
    suspeitaIsca,
  };
  return { anuncio, descartar: false };
}

/** Preço do anúncio principal: ancorado na janela do `redacted_description`. */
function precoAncorado(html: string): number | null {
  const di = html.indexOf('"redacted_description"');
  const jan = di === -1 ? html : html.slice(Math.max(0, di - 9000), di + 9000);
  const m = jan.match(/"listing_price":\{"amount":"([\d.]+)"/);
  return m ? Math.round(Number(m[1])) : null;
}

/** Título ancorado no bloco do principal (fallback quando não há og:title). */
function campoUnicoAncorado(html: string, chave: string): string | null {
  const di = html.indexOf('"redacted_description"');
  const jan = di === -1 ? html : html.slice(Math.max(0, di - 9000), di + 9000);
  const m = jan.match(new RegExp(`"${chave}":"([^"]+)"`));
  return m ? decodar(m[1]) : null;
}

/** Texto da descrição do anúncio principal. */
function descricaoDoPrincipal(html: string): string | null {
  const di = html.indexOf('"redacted_description":{"text":"');
  if (di === -1) return null;
  const raw = html.slice(di + 31, di + 31 + 4000);
  return decodar(raw.split('"},"')[0].replace(/"$/, ""));
}
