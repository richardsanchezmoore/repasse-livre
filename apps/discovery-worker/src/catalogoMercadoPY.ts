/**
 * CATÁLOGO DE MERCADO — o que circula no Paraguai FORA da frota japonesa.
 *
 * ★★ POR QUE EXISTE (Gustavo, 08/10/2026): *"lembre: temos KIA, Chevrolet, e as
 * marcas chinesas etc. Será possível colocar um 'catálogo inteiro' de pesquisa
 * por termos?"*. Ele estava certo e a medida confirma — o catálogo JDM tem 59
 * modelos (40 Toyota, 10 Mitsubishi, 9 Kia) e cobre **~53% da base**:
 *
 *   Toyota 46% · Kia 6% · Mercedes 6% · VW 5% · Chevrolet 3% · Hyundai 3%
 *   BMW 3% · Ford 3% · Jeep 2% · Nissan 2% · Dodge 2% · Honda/Audi/Suzuki 1%
 *   Jetour, Kenton, BYD — as chinesas já aparecendo
 *
 * Quase metade do mercado não tinha termo de busca nem geração.
 *
 * ═══ POR QUE É UM ARQUIVO SEPARADO, E ENXUTO ═══
 *
 * ⚠️ O catálogo JDM carrega `origem` (japão = volante convertido, coreia = LHD
 * de fábrica), `destaques` (diesel/glp/kei) e `raridade` — campos que existem
 * porque a frota japonesa É a tese do produto. Um Gol não tem "origem de
 * importação japonesa", e enfiá-lo lá dentro diluiria o que aquele arquivo
 * significa.
 *
 * Aqui basta o que a tabela de preço precisa: **nome, marca e gerações**.
 *
 * ═══ ★★ O CAMPO QUE A NOITE DE 07→08/10 ENSINOU: `comMarca` ═══
 *
 * A busca por palavra-chave do Facebook NÃO aceita restrição de categoria —
 * cinco variantes de URL testadas, todas ignoram. Buscar "century" trouxe vara
 * de pesca, relógio e multivitamínico, e nove viraram "Toyota Century" no banco.
 *
 * ⚠️ Nome de modelo que também é palavra comum tem o mesmo destino: "Soul",
 * "Fit", "Spark", "March", "Focus", "Journey", "Escape", "Note". Esses buscam
 * **com a marca junto** ("kia soul"), que é o que separa o carro do resto.
 *
 * ⚠️ Mas NÃO é o padrão para todos: "hiace" sozinho devolveu 20 anúncios, e
 * "toyota hiace" devolveria menos, porque muito vendedor escreve só o modelo.
 * Marcar só onde o nome colide com vocabulário comum.
 */

export interface ModeloMercado {
  /** Como aparece no anúncio, em minúsculas. O primeiro é o canônico. */
  nomes: string[];
  marca: string;
  /**
   * Buscar como "marca modelo" em vez do nome solto.
   * ⚠️ Só para nome que é palavra comum — ver o cabeçalho.
   */
  comMarca?: boolean;
  /** Nota de praça, quando há algo que o nome não diz. */
  nota?: string;
}

export const CATALOGO_MERCADO: ModeloMercado[] = [
  // ───────────────────────── Kia (além do que o JDM já tem) ─────────────────
  { nomes: ["cerato"], marca: "Kia" },
  { nomes: ["sorento"], marca: "Kia" },
  { nomes: ["carnival", "grand carnival"], marca: "Kia" },
  { nomes: ["soul"], marca: "Kia", comMarca: true, nota: "'soul' sozinho traz de tudo" },
  { nomes: ["picanto"], marca: "Kia", nota: "o mesmo carro que o Morning coreano" },
  { nomes: ["seltos"], marca: "Kia" },
  { nomes: ["stonic"], marca: "Kia" },
  { nomes: ["niro"], marca: "Kia" },

  // ───────────────────────── Hyundai ────────────────────────────────────────
  { nomes: ["tucson"], marca: "Hyundai" },
  { nomes: ["accent"], marca: "Hyundai" },
  { nomes: ["santa fe"], marca: "Hyundai" },
  { nomes: ["elantra"], marca: "Hyundai" },
  { nomes: ["creta"], marca: "Hyundai" },
  { nomes: ["hb20"], marca: "Hyundai" },
  { nomes: ["starex", "h1"], marca: "Hyundai", nota: "van; concorre com a Hiace na praça" },
  { nomes: ["porter"], marca: "Hyundai", comMarca: true },

  // ───────────────────────── Nissan ─────────────────────────────────────────
  { nomes: ["frontier"], marca: "Nissan" },
  { nomes: ["x-trail", "xtrail"], marca: "Nissan" },
  { nomes: ["kicks"], marca: "Nissan" },
  { nomes: ["march"], marca: "Nissan", comMarca: true, nota: "'march' é mês em inglês" },
  { nomes: ["note"], marca: "Nissan", comMarca: true, nota: "'note' é palavra comum" },
  { nomes: ["tiida"], marca: "Nissan" },
  { nomes: ["versa"], marca: "Nissan" },
  { nomes: ["navara"], marca: "Nissan" },

  // ───────────────────────── Honda ──────────────────────────────────────────
  { nomes: ["fit"], marca: "Honda", comMarca: true, nota: "'fit' é palavra comum" },
  { nomes: ["civic"], marca: "Honda" },
  { nomes: ["cr-v", "crv"], marca: "Honda" },
  { nomes: ["hr-v", "hrv"], marca: "Honda" },
  { nomes: ["odyssey", "odisey", "odysey"], marca: "Honda", nota: "grafias erradas são comuns no anúncio" },
  { nomes: ["vezel"], marca: "Honda" },

  // ───────────────────────── Suzuki ─────────────────────────────────────────
  { nomes: ["swift"], marca: "Suzuki", comMarca: true, nota: "'swift' é palavra comum" },
  { nomes: ["vitara", "grand vitara"], marca: "Suzuki" },
  { nomes: ["jimny"], marca: "Suzuki" },
  { nomes: ["alto"], marca: "Suzuki", comMarca: true, nota: "'alto' é palavra espanhola" },
  { nomes: ["baleno"], marca: "Suzuki" },

  // ───────────────────────── Volkswagen ─────────────────────────────────────
  { nomes: ["gol"], marca: "Volkswagen", comMarca: true, nota: "'gol' é gol de futebol" },
  { nomes: ["golf"], marca: "Volkswagen", comMarca: true },
  { nomes: ["polo"], marca: "Volkswagen", comMarca: true, nota: "'polo' é camisa e esporte" },
  { nomes: ["amarok"], marca: "Volkswagen" },
  { nomes: ["tiguan"], marca: "Volkswagen" },
  { nomes: ["jetta"], marca: "Volkswagen" },
  { nomes: ["passat"], marca: "Volkswagen" },
  { nomes: ["virtus"], marca: "Volkswagen" },
  { nomes: ["t-cross", "tcross"], marca: "Volkswagen" },
  { nomes: ["saveiro"], marca: "Volkswagen" },

  // ───────────────────────── Chevrolet ──────────────────────────────────────
  { nomes: ["onix"], marca: "Chevrolet" },
  { nomes: ["cruze"], marca: "Chevrolet" },
  { nomes: ["s10", "s-10"], marca: "Chevrolet" },
  { nomes: ["captiva"], marca: "Chevrolet" },
  { nomes: ["spark"], marca: "Chevrolet", comMarca: true, nota: "'spark' é palavra comum" },
  { nomes: ["tracker"], marca: "Chevrolet", comMarca: true },
  { nomes: ["camaro"], marca: "Chevrolet" },
  { nomes: ["aveo"], marca: "Chevrolet" },
  { nomes: ["celta"], marca: "Chevrolet" },
  { nomes: ["luv", "d-max", "dmax"], marca: "Chevrolet", comMarca: true, nota: "'luv' é palavra comum em inglês" },

  // ───────────────────────── Ford ───────────────────────────────────────────
  { nomes: ["ranger"], marca: "Ford", comMarca: true },
  { nomes: ["ecosport"], marca: "Ford" },
  { nomes: ["fiesta"], marca: "Ford" },
  { nomes: ["focus"], marca: "Ford", comMarca: true, nota: "'focus' é palavra comum" },
  { nomes: ["f-150", "f150"], marca: "Ford" },
  { nomes: ["escape"], marca: "Ford", comMarca: true, nota: "'escape' é palavra comum" },
  { nomes: ["mustang"], marca: "Ford" },
  { nomes: ["explorer"], marca: "Ford", comMarca: true },
  { nomes: ["territory"], marca: "Ford", comMarca: true },

  // ───────────────────────── Jeep / Dodge / RAM ─────────────────────────────
  { nomes: ["renegade"], marca: "Jeep" },
  { nomes: ["compass"], marca: "Jeep", comMarca: true },
  { nomes: ["cherokee", "grand cherokee"], marca: "Jeep" },
  { nomes: ["wrangler"], marca: "Jeep" },
  { nomes: ["journey"], marca: "Dodge", comMarca: true, nota: "'journey' é palavra comum" },
  { nomes: ["durango"], marca: "Dodge" },
  { nomes: ["ram 1500", "ram"], marca: "RAM", comMarca: true, nota: "'ram' é memória de computador" },

  // ───────────────────────── Mercedes-Benz ──────────────────────────────────
  { nomes: ["c180", "c200", "c220", "c250", "c300", "clase c", "c-class"], marca: "Mercedes-Benz" },
  { nomes: ["e200", "e250", "e320", "clase e"], marca: "Mercedes-Benz" },
  { nomes: ["gla"], marca: "Mercedes-Benz" },
  { nomes: ["glc"], marca: "Mercedes-Benz" },
  { nomes: ["gle", "ml"], marca: "Mercedes-Benz" },
  { nomes: ["sprinter"], marca: "Mercedes-Benz" },

  // ───────────────────────── BMW / Audi ─────────────────────────────────────
  { nomes: ["serie 3", "320i", "320d", "330i"], marca: "BMW" },
  { nomes: ["serie 5", "520i", "530i"], marca: "BMW" },
  { nomes: ["x1"], marca: "BMW", comMarca: true },
  { nomes: ["x3"], marca: "BMW", comMarca: true },
  { nomes: ["x5"], marca: "BMW", comMarca: true },
  { nomes: ["a3"], marca: "Audi", comMarca: true },
  { nomes: ["a4"], marca: "Audi", comMarca: true },
  { nomes: ["q3"], marca: "Audi", comMarca: true },
  { nomes: ["q5"], marca: "Audi", comMarca: true },
  { nomes: ["q7"], marca: "Audi", comMarca: true },

  // ───────────────────────── Renault / Peugeot / Fiat ───────────────────────
  { nomes: ["duster"], marca: "Renault" },
  { nomes: ["sandero"], marca: "Renault" },
  { nomes: ["kwid"], marca: "Renault" },
  { nomes: ["logan"], marca: "Renault", comMarca: true },
  { nomes: ["master"], marca: "Renault", comMarca: true, nota: "'master' é palavra comum" },
  { nomes: ["208"], marca: "Peugeot", comMarca: true },
  { nomes: ["2008"], marca: "Peugeot", comMarca: true, nota: "sozinho vira busca por ano" },
  { nomes: ["uno"], marca: "Fiat", comMarca: true, nota: "'uno' é o número um em espanhol" },
  { nomes: ["toro"], marca: "Fiat", comMarca: true },
  { nomes: ["strada"], marca: "Fiat", comMarca: true },

  // ═════════════════════════ ★ AS CHINESAS ═══════════════════════════════════
  //
  // ★ Gustavo apontou e a base confirma: Jetour, Kenton e BYD já aparecem. São
  // a onda nova do Paraguai e hoje não têm NENHUMA cobertura nossa — nem termo
  // de busca, nem geração, nem normalização de modelo.
  //
  // ⚠️ Quase todo nome aqui é palavra comum ou número, então vão quase todos
  // com a marca junto.
  { nomes: ["yuan"], marca: "BYD", comMarca: true },
  { nomes: ["song"], marca: "BYD", comMarca: true, nota: "'song' é música em inglês" },
  { nomes: ["dolphin"], marca: "BYD", comMarca: true },
  { nomes: ["han"], marca: "BYD", comMarca: true },
  { nomes: ["seal"], marca: "BYD", comMarca: true },
  { nomes: ["tiggo", "tiggo 2", "tiggo 4", "tiggo 7", "tiggo 8"], marca: "Chery" },
  { nomes: ["arrizo"], marca: "Chery" },
  { nomes: ["haval h6", "haval"], marca: "Great Wall" },
  { nomes: ["wingle"], marca: "Great Wall" },
  { nomes: ["poer"], marca: "Great Wall", comMarca: true },
  { nomes: ["x70"], marca: "Jetour", comMarca: true },
  { nomes: ["dashing"], marca: "Jetour", comMarca: true },
  { nomes: ["x90"], marca: "Jetour", comMarca: true },
  { nomes: ["coolray"], marca: "Geely" },
  { nomes: ["emgrand"], marca: "Geely" },
  { nomes: ["cs35", "cs55", "cs75"], marca: "Changan" },
  { nomes: ["glory", "glory 580"], marca: "DFSK", comMarca: true },
  { nomes: ["s2", "s3", "t8"], marca: "JAC", comMarca: true, nota: "nomes curtíssimos; sem a marca não há busca" },
  { nomes: ["tunland"], marca: "Foton" },
  { nomes: ["kenton"], marca: "Kenton", nota: "marca vista na base; confirmar o que é antes de confiar" },
];

/**
 * Os termos de busca, prontos para a varredura.
 *
 * ⚠️ Devolve "marca modelo" quando `comMarca`, e o nome solto quando não —
 * ver o cabeçalho para o porquê de não ser sempre com marca.
 */
export function termosDeBusca(): string[] {
  return CATALOGO_MERCADO.map((m) =>
    m.comMarca ? `${m.marca.toLowerCase()} ${m.nomes[0]}` : m.nomes[0],
  );
}

/** Quantos termos este catálogo gera, e quantos precisam da marca. */
export function resumoMercado(): { modelos: number; comMarca: number; marcas: number } {
  return {
    modelos: CATALOGO_MERCADO.length,
    comMarca: CATALOGO_MERCADO.filter((m) => m.comMarca).length,
    marcas: new Set(CATALOGO_MERCADO.map((m) => m.marca)).size,
  };
}
