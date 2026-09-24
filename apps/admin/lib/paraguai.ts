/**
 * Divisão territorial do Paraguai — departamentos e seus municípios.
 *
 * ★ POR QUE ISTO EXISTE: no painel, cidade era campo livre e departamento era
 * um select separado, sem nada amarrando os dois. Resultado, nas palavras do
 * Gustavo (23/09): *"achei que estamos com os filtros meio bagunçado, todos
 * puxam as mesmas cidades confundindo com departamentos... se definirmos
 * departamento as cidades têm que ser somente daquele departamento"*.
 * Ele tem razão: sem o vínculo, dá para cadastrar "Encarnación" dentro de
 * Alto Paraná e nada reclama — e a região nasce com slug errado.
 *
 * FONTE: censo nacional de 2022 (population por município). População total do
 * país: 6.109.903.
 *
 * ⚠️ Só entram municípios com **10.000+ habitantes**, mais a capital de cada
 * departamento mesmo quando menor. Abaixo disso não há volume de anúncio de
 * carro que justifique uma praça própria no Marketplace — e a lista completa
 * (263 municípios) só atrapalharia a escolha.
 */

export interface MunicipioPY {
  nome: string;
  pop: number;
  /** Capital do departamento. */
  capital?: boolean;
  /** Faz parte da Grande Assunção (conurbação com a capital). */
  metro?: boolean;
}

/**
 * ★★ A CONCENTRAÇÃO QUE DECIDE A ORDEM DE ATAQUE.
 *
 * Central (1.883.927) + Asunción (462.241) = **2,35 milhões, 38% do país**,
 * num raio pequeno. Alto Paraná soma 763.702, e só Ciudad del Este tem 325.819.
 * Esses dois blocos são **metade do Paraguai**.
 *
 * É a mesma lógica da Grande Porto Alegre e da Grande São Paulo no Brasil: a
 * Grande Assunção precisa entrar **cidade a cidade**, porque uma praça só com
 * raio grande mistura mercados que têm preço diferente — e porque o Facebook
 * prioriza o centro do raio e abre por escassez.
 */
export const DEPARTAMENTOS_PY: {
  cod: string;
  nome: string;
  pop: number;
  municipios: MunicipioPY[];
}[] = [
  {
    cod: "PY-ASU",
    nome: "Asunción (Distrito Capital)",
    pop: 462_241,
    municipios: [{ nome: "Asunción", pop: 462_241, capital: true, metro: true }],
  },
  {
    cod: "PY-CEN",
    nome: "Central (Grande Assunção)",
    pop: 1_883_927,
    municipios: [
      { nome: "Luque", pop: 259_705, metro: true },
      { nome: "Capiatá", pop: 236_999, metro: true },
      { nome: "San Lorenzo", pop: 225_395, metro: true },
      { nome: "Limpio", pop: 139_652, metro: true },
      { nome: "Lambaré", pop: 127_150, metro: true },
      { nome: "Ñemby", pop: 116_383, metro: true },
      { nome: "Fernando de la Mora", pop: 110_255, metro: true },
      { nome: "Itauguá", pop: 93_213, metro: true },
      { nome: "Mariano Roque Alonso", pop: 85_133, metro: true },
      { nome: "Villa Elisa", pop: 71_383, metro: true },
      { nome: "Areguá", pop: 70_298, capital: true, metro: true },
      { nome: "Itá", pop: 69_049, metro: true },
      { nome: "Ypané", pop: 66_700, metro: true },
      { nome: "Julián Augusto Saldívar", pop: 60_162, metro: true },
      { nome: "San Antonio", pop: 57_843, metro: true },
      { nome: "Villeta", pop: 35_941 },
      { nome: "Guarambaré", pop: 27_695 },
      { nome: "Ypacaraí", pop: 21_030 },
    ],
  },
  {
    cod: "PY-APA",
    nome: "Alto Paraná (CDE)",
    pop: 763_702,
    municipios: [
      { nome: "Ciudad del Este", pop: 325_819, capital: true },
      { nome: "Presidente Franco", pop: 88_744 },
      { nome: "Hernandarias", pop: 83_285 },
      { nome: "Minga Guazú", pop: 81_072 },
      { nome: "Itakyry", pop: 27_340 },
      { nome: "Santa Rita", pop: 27_249 },
      { nome: "Dr. Juan León Mallorquín", pop: 16_144 },
      { nome: "Juan E. O'Leary", pop: 16_092 },
      { nome: "Minga Porá", pop: 11_959 },
      { nome: "San Alberto", pop: 11_162 },
    ],
  },
  {
    cod: "PY-ITA",
    nome: "Itapúa (Encarnación)",
    pop: 449_642,
    municipios: [
      { nome: "Encarnación", pop: 106_842, capital: true },
      { nome: "Cambyretá", pop: 47_717 },
      { nome: "Tomás Romero Pereira", pop: 25_419 },
      { nome: "San Pedro del Paraná", pop: 22_318 },
      { nome: "Edelira", pop: 17_362 },
      { nome: "Coronel Bogado", pop: 17_192 },
      { nome: "Natalio", pop: 14_865 },
      { nome: "San Rafael del Paraná", pop: 14_166 },
      { nome: "Carlos Antonio López", pop: 13_792 },
      { nome: "Obligado", pop: 13_606 },
      { nome: "Hohenau", pop: 12_809 },
      { nome: "Alto Verá", pop: 11_503 },
      { nome: "Bella Vista Sur", pop: 10_447 },
      { nome: "Mayor Otaño", pop: 10_101 },
    ],
  },
  {
    cod: "PY-CAG",
    nome: "Caaguazú",
    pop: 431_519,
    municipios: [
      { nome: "Coronel Oviedo", pop: 98_323, capital: true },
      { nome: "Caaguazú", pop: 98_200 },
      { nome: "Dr. Juan E. Estigarribia (Campo 9)", pop: 38_894 },
      { nome: "Repatriación", pop: 24_459 },
      { nome: "Yhú", pop: 22_524 },
      { nome: "Dr. Juan Manuel Frutos", pop: 20_451 },
      { nome: "San José de los Arroyos", pop: 13_926 },
      { nome: "Tembiaporá", pop: 12_877 },
      { nome: "Raúl Arsenio Oviedo", pop: 12_543 },
      { nome: "San Joaquín", pop: 11_949 },
      { nome: "Carayaó", pop: 10_832 },
      { nome: "Vaquería", pop: 10_498 },
    ],
  },
  {
    cod: "PY-SPE",
    nome: "San Pedro",
    pop: 355_175,
    municipios: [
      { nome: "San Estanislao (Santaní)", pop: 46_405 },
      { nome: "Santa Rosa del Aguaray", pop: 39_643 },
      { nome: "San Pedro de Ycuamandiyú", pop: 32_267, capital: true },
      { nome: "Capiibary", pop: 30_570 },
      { nome: "Guayaibí", pop: 28_214 },
      { nome: "Choré", pop: 23_548 },
      { nome: "Liberación", pop: 19_100 },
      { nome: "General Elizardo Aquino", pop: 16_971 },
      { nome: "Tacuatí", pop: 13_847 },
      { nome: "Yrybucuá", pop: 12_271 },
      { nome: "San Vicente Pancholo", pop: 11_571 },
      { nome: "Itacurubí del Rosario", pop: 10_507 },
      { nome: "Lima", pop: 10_303 },
      { nome: "Yataity del Norte", pop: 10_113 },
      { nome: "General Isidoro Resquín", pop: 10_019 },
    ],
  },
  {
    cod: "PY-COR",
    nome: "Cordillera",
    pop: 268_037,
    municipios: [
      { nome: "Caacupé", pop: 50_409, capital: true },
      { nome: "Tobatí", pop: 27_435 },
      { nome: "Piribebuy", pop: 25_758 },
      { nome: "Emboscada", pop: 21_182 },
      { nome: "Arroyos y Esteros", pop: 20_347 },
      { nome: "Eusebio Ayala", pop: 19_334 },
      { nome: "Atyrá", pop: 15_988 },
      { nome: "Altos", pop: 14_461 },
      { nome: "San Bernardino", pop: 12_216 },
      { nome: "Caraguatay", pop: 10_143 },
    ],
  },
  {
    cod: "PY-CON",
    nome: "Concepción",
    pop: 206_181,
    municipios: [
      { nome: "Concepción", pop: 73_360, capital: true },
      { nome: "Horqueta", pop: 39_548 },
      { nome: "Yby Yaú", pop: 19_468 },
      { nome: "Loreto", pop: 13_580 },
      { nome: "San Lázaro", pop: 11_192 },
      { nome: "Belén", pop: 10_605 },
    ],
  },
  {
    cod: "PY-PAR",
    nome: "Paraguarí",
    pop: 200_472,
    municipios: [
      { nome: "Carapeguá", pop: 29_351 },
      { nome: "Yaguarón", pop: 29_242 },
      { nome: "Paraguarí", pop: 20_678, capital: true },
      { nome: "Ybycuí", pop: 17_972 },
      { nome: "Pirayú", pop: 17_419 },
      { nome: "Quiindy", pop: 14_488 },
      { nome: "Acahay", pop: 12_646 },
    ],
  },
  {
    cod: "PY-CAN",
    nome: "Canindeyú",
    pop: 191_114,
    municipios: [
      { nome: "Curuguaty", pop: 33_561 },
      { nome: "Salto del Guairá", pop: 28_553, capital: true },
      { nome: "Yasy Cañy", pop: 20_399 },
      { nome: "Maracaná", pop: 15_357 },
      { nome: "Villa Ygatimí", pop: 13_074 },
      { nome: "Yby Pytá", pop: 12_284 },
      { nome: "Nueva Esperanza", pop: 11_069 },
      { nome: "Katueté", pop: 10_774 },
    ],
  },
  {
    cod: "PY-GUA",
    nome: "Guairá",
    pop: 179_555,
    municipios: [
      { nome: "Villarrica", pop: 62_565, capital: true },
      { nome: "Paso Yobái", pop: 20_562 },
      { nome: "Independencia", pop: 19_235 },
    ],
  },
  {
    cod: "PY-AMA",
    nome: "Amambay (Pedro Juan)",
    pop: 179_412,
    municipios: [
      { nome: "Pedro Juan Caballero", pop: 127_437, capital: true },
      { nome: "Capitán Bado", pop: 18_851 },
      { nome: "Bella Vista Norte", pop: 12_027 },
      { nome: "Cerro Corá", pop: 10_690 },
    ],
  },
  {
    cod: "PY-CAZ",
    nome: "Caazapá",
    pop: 139_479,
    municipios: [
      { nome: "San Juan Nepomuceno", pop: 28_233 },
      { nome: "Caazapá", pop: 23_654, capital: true },
      { nome: "Abaí", pop: 21_964 },
      { nome: "Tavaí", pop: 16_409 },
      { nome: "Yuty", pop: 14_924 },
      { nome: "Tres de Mayo", pop: 12_923 },
    ],
  },
  {
    cod: "PY-PHA",
    nome: "Pdte. Hayes",
    pop: 123_313,
    municipios: [
      { nome: "Villa Hayes", pop: 47_967, capital: true },
      { nome: "Benjamín Aceval", pop: 22_008 },
      { nome: "Teniente Irala", pop: 20_145 },
    ],
  },
  {
    cod: "PY-MIS",
    nome: "Misiones",
    pop: 111_142,
    municipios: [
      { nome: "San Ignacio Guazú", pop: 29_430 },
      { nome: "San Juan Bautista", pop: 20_979, capital: true },
      { nome: "Ayolas", pop: 17_337 },
      { nome: "Santa Rosa de Lima", pop: 16_403 },
    ],
  },
  {
    cod: "PY-NEE",
    nome: "Ñeembucú",
    pop: 76_719,
    municipios: [{ nome: "Pilar", pop: 34_741, capital: true }],
  },
  {
    cod: "PY-BOQ",
    nome: "Boquerón (Chaco)",
    pop: 71_078,
    municipios: [
      { nome: "Filadelfia", pop: 20_595, capital: true },
      { nome: "Loma Plata", pop: 20_545 },
      { nome: "Boquerón", pop: 16_764 },
      { nome: "Mariscal Estigarribia", pop: 13_174 },
    ],
  },
  {
    cod: "PY-APY",
    nome: "Alto Paraguay",
    pop: 17_195,
    municipios: [{ nome: "Fuerte Olimpo", pop: 4_586, capital: true }],
  },
];

/** Municípios de um departamento, do maior para o menor. */
export function municipiosDe(cod: string): MunicipioPY[] {
  return DEPARTAMENTOS_PY.find((d) => d.cod === cod)?.municipios ?? [];
}

export const ehPY = (uf: string) => uf.startsWith("PY-");
export const paisDaUf = (uf: string) => (ehPY(uf) ? "PY" : "BR");
export const rotuloUf = (uf: string) =>
  ehPY(uf) ? (DEPARTAMENTOS_PY.find((d) => d.cod === uf)?.nome ?? uf.slice(3)) : uf || "? sem UF";
