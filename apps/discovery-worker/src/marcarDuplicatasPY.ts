import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * MARCA OS REANÚNCIOS — o mesmo carro publicado várias vezes.
 *
 * ★ Ver o cabeçalho de `supabase/migrations/0094_py_duplicata.sql` para o
 * diagnóstico: não é bug de captura (0 grupos por link repetido, 0 por foto),
 * é o vendedor republicando e o Facebook dando id novo a cada vez.
 *
 * ⚠️ A CHAVE É modelo+ano+preço+moeda+cidade. Conferido num grupo de 7: mesma
 * descrição palavra por palavra. ⚠️ Descrição NÃO entra na chave — a mesma loja
 * publica o mesmo carro com dois textos diferentes (um com emoji, outro sem), e
 * usar o texto SEPARARIA duplicata verdadeira.
 *
 * ⚠️ Mantém o MAIS RECENTE (por data de publicação; empate cai na captura).
 * É o anúncio que ainda está no ar; os anteriores o vendedor já derrubou.
 *
 * ⚠️ NÃO APAGA e NÃO REJEITA: só preenche `duplicata_de`. A observação de preço
 * continua no livro, e a mediana conta ofertas distintas de qualquer jeito.
 *
 * Uso:
 *   npx tsx src/marcarDuplicatasPY.ts            → só conta (seco)
 *   npx tsx src/marcarDuplicatasPY.ts --aplicar  → marca
 */
const APLICAR = process.argv.includes("--aplicar");

interface Linha {
  id: string;
  veiculo: string | null;
  descricao: string | null;
  modelo: string | null;
  ano: string | null;
  preco: number | null;
  moeda: string | null;
  cidade: string | null;
  data_publicacao_origem: string | null;
  data_captura: string | null;
  duplicata_de: string | null;
}

async function todas(): Promise<Linha[]> {
  const t: Linha[] = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, veiculo, descricao, modelo, ano, preco, moeda, cidade, data_publicacao_origem, data_captura, duplicata_de")
      .eq("pais", "PY")
      .neq("status", "rejeitada")
      .range(de, de + 999);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as Linha[];
    t.push(...lote);
    if (lote.length < 1000) break;
  }
  return t;
}


/**
 * ★★★ A REGRA DO GUSTAVO, ADAPTADA AO PARAGUAI (11/10/2026).
 *
 * Ele lembrou da regra do Repasse Livre: *"considerar o mesmo anúncio somente
 * se tinha preço diferente e assim excluir o velho"*. Lá a identidade era
 * TÍTULO + KM (`buscarDuplicataPorTituloEKm`), e aí o preço decidia quem fica.
 *
 * ⚠⚠ NO PARAGUAI NENHUMA DAS DUAS SERVE:
 *   • KM quase ninguém preenche — observação dele mesmo: *"poucos colocam KM e
 *     demais detalhes"*;
 *   • TÍTULO não é estável — a MESMA loja publica o mesmo carro como
 *     "MITSUBISHI PAJERO JUNIOR AÑO 1999..." e como "🔵 MITSUBISHI PAJERO
 *     JUNIOR 1999 🔵...". Foi medido: por isso a guarda antiga, que casa
 *     `veiculo` exato, deixava tudo passar.
 *
 * ★ O que SOBREVIVE à republicação e à mudança de preço é o CORPO DA DESCRIÇÃO.
 * Então a identidade é descrição normalizada + cidade, e o preço fica FORA da
 * chave — que é exatamente o caso que o passo anterior (com preço na chave)
 * não pegava.
 *
 * ⚠️ Normaliza agressivamente: minúscula, sem acento, sem emoji, sem pontuação,
 * sem número. Sem tirar o NÚMERO, a própria mudança de preço dentro do texto
 * ("22.900.000gs") quebraria a identidade — e é justamente ela que queremos
 * atravessar.
 *
 * ⚠⚠ DESCRIÇÃO CURTA NÃO AGRUPA. Com 40 caracteres ou menos ("vendo auto",
 * "buen estado"), o texto não identifica carro nenhum e fundiria anúncios
 * distintos. Na dúvida não colapsa: esconder carro real é pior que mostrar
 * repetido, porque o repetido o usuário percebe e o escondido não.
 */

/**
 * ⚠⚠⚠ LÁPIDE: SEMELHANÇA DE TEXTO FOI TENTADA E REJEITADA (11/10/2026).
 *
 * Dois “Toyota Grand Hiace 2000” idênticos sobrevivem aos dois critérios acima
 * porque a LINHA DE CONTATO muda no MEIO do texto (“tratar al [hidden
 * information]” vs “consultas al wa me”) — prefixo comum: zero caracteres.
 * Dice sobre conjunto de palavras resolveria: dá 0,90 nesse par.
 *
 * ⚠⚠ MAS A MEDIÇÃO REPROVOU. Com limiar 0,82 e balde modelo+ano+cidade, as
 * marcações saltaram de 29 para 59, e a amostra mostrou o que entrou a mais:
 *
 *     Toyota Corolla Runx 2005 — sim 0,82
 *       ₲39.800.000  “TOYOTA RUNX NEGRO  AÑO 2005 -CAJA AUT. -4X2...”
 *       ₲39.800.000  “TOYOTA RUNX ROJO   AÑO 2005 REAL -CAJA AUT...”
 *
 * PRETO e VERMELHO: dois carros DIFERENTES da mesma loja, mesmo preço, mesmo
 * template de texto. E um Toyota Ist 2006 agrupou TRÊS anúncios com TRÊS
 * preços distintos.
 *
 * ★ O veneno é o TEMPLATE DA LOJA — o mesmo que já tinha fundido quatro motos
 * distintas pelo texto de financiamento. Lojas descrevem carros diferentes com
 * as mesmas palavras, e nenhum limiar separa isso: subir o limiar perde o Grand
 * Hiace, baixar esconde o Runx.
 *
 * ⚠️ O custo de cada erro NÃO É SIMÉTRICO. Falso negativo = um card repetido,
 * que o usuário vê e entende. Falso positivo = um carro real sumido, que
 * ninguém percebe. Por isso fica só exato + contínencia, que na amostra deram
 * ZERO falso positivo.
 *
 * ★ O que destravaria isto de verdade não é um limiar melhor: é a FOTO. Mesma
 * imagem = mesmo carro, sem ambiguidade. Hoje cada captura re-hospeda a foto
 * num arquivo novo (0 grupos por foto idêntica), então exigiria hash perceptual
 * da imagem.
 */
const MINIMO_DESCRICAO = 40;

function identidadeDoTexto(descricao: string | null): string | null {
  const limpo = String(descricao ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // acento
    .replace(/[͏​-‏﻿]/g, "")        // ⚠️ ofuscação invisível do FB
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")                           // tira emoji, pontuação E número
    .replace(/s+/g, " ").trim();
  return limpo.length >= MINIMO_DESCRICAO ? limpo : null;
}

const quando = (o: Linha) => String(o.data_publicacao_origem ?? o.data_captura ?? "");

async function main() {
  const linhas = await todas();
  console.log(`${linhas.length} anúncios ativos`);

  const grupos = new Map<string, Linha[]>();
  for (const o of linhas) {
    // ⚠️ Sem modelo ou sem preço não dá para afirmar que é o mesmo carro.
    // Na dúvida, NÃO colapsa: esconder anúncio distinto é pior que mostrar
    // repetido, porque o repetido o usuário percebe e o escondido não.
    if (!o.modelo || o.preco == null || !o.cidade) continue;
    const k = `${o.modelo}|${o.ano ?? ""}|${o.preco}|${o.moeda}|${o.cidade}`;
    grupos.set(k, [...(grupos.get(k) ?? []), o]);
  }

  const marcar: { id: string; duplicata_de: string }[] = [];
  const desmarcar: string[] = [];
  let maiorGrupo = 0;

  for (const g of grupos.values()) {
    if (g.length < 2) {
      // ⚠️ Grupo que deixou de ser duplicata (o irmão saiu do ar) tem que
      // VOLTAR. Sem isto, uma marcação errada fica para sempre.
      if (g[0].duplicata_de) desmarcar.push(g[0].id);
      continue;
    }
    maiorGrupo = Math.max(maiorGrupo, g.length);
    const ordenado = [...g].sort((a, b) => quando(b).localeCompare(quando(a)));
    const mantido = ordenado[0];
    if (mantido.duplicata_de) desmarcar.push(mantido.id);
    for (const o of ordenado.slice(1)) {
      if (o.duplicata_de !== mantido.id) marcar.push({ id: o.id, duplicata_de: mantido.id });
    }
  }

  // ═══ PASSO 2: o mesmo carro com PREÇO NOVO ═══
  //
  // ⚠️ Só olha o que o passo 1 NÃO marcou — senão um anúncio já colapsado
  // apontaria para dois mantidos diferentes e a cadeia ficaria incoerente.
  const jaMarcado = new Set(marcar.map((m) => m.id));
  const porTexto = new Map<string, Linha[]>();
  for (const o of linhas) {
    if (jaMarcado.has(o.id)) continue;
    const t = identidadeDoTexto(o.descricao);
    // ⚠⚠ O MODELO ENTRA NA CHAVE. Descrição sozinha DÁ FALSO POSITIVO e eu
    // peguei um no ensaio: quatro MOTOS diferentes (Kenton Dakar, Buler, Kenton
    // Bull, Skua), de preços e moedas diferentes, com o mesmo texto de
    // financiamento colado pela loja — "Sería con sus datos personales, a qué
    // se dedica, cuánto es su ingreso...". Agrupar por texto esconderia três
    // veículos reais.
    //
    // ★ Com modelo+ano na chave, o caso legítimo continua passando (Mercedes
    // C200 1994 que caiu de ₲30M para ₲26M é o mesmo carro) e o boilerplate
    // de loja para de fundir carros distintos.
    // ⚠️ AQUI a cidade pode faltar, diferente do passo 1. A regra herdada da
    // era Brasil diz "sem cidade no anúncio, a chave NÃO aplica — não funde às
    // cegas", e ela vale para a chave de lá (modelo+ano+preço), que é frouxa
    // sem a cidade. Esta chave tem DESCRIÇÃO INTEIRA, que já identifica sozinha.
    //
    // ★ O caso que isto pega: dois "Toyota Grand Hiace 2000" a ₲74.000.000,
    // publicados com 1h de diferença, ambos SEM cidade — o passo 1 os pulava
    // justamente por isso, e eles apareciam lado a lado na home.
    if (!t || !o.modelo) continue;
    const k = `${o.modelo}|${o.ano ?? ""}|${o.cidade ?? ""}`;
    (o as Linha & { _txt?: string })._txt = t;
    porTexto.set(k, [...(porTexto.get(k) ?? []), o]);
  }

  // ⚠⚠ IGUALDADE EXATA DO TEXTO ERRAVA um caso real: dois "Toyota Grand Hiace
  // 2000" a ₲74.000.000, mesmo corpo de descrição palavra por palavra, mas um
  // deles com o prefixo de ficha da loja (".Ref. 3703 ☮️"). 406 contra 346
  // caracteres, hash diferente, e os dois apareciam lado a lado na home.
  //
  // ★ Então o balde é modelo+ano+cidade e, DENTRO dele, dois anúncios são o
  // mesmo quando um texto CONTÉM o outro. Continência tolera prefixo e sufixo
  // (número de referência, selo de loja, linha de contato acrescentada depois)
  // sem afrouxar o miolo, que é o que descreve o carro.
  //
  // ⚠️ O(n²) dentro do balde, e tudo bem: balde é modelo+ano+cidade, que na
  // prática tem poucas unidades.
  let precoMudou = 0;
  const clusterizar = (balde: Linha[]): Linha[][] => {
    const grupos: Linha[][] = [];
    for (const o of balde) {
      const t = (o as Linha & { _txt?: string })._txt ?? "";
      const achado = grupos.find((g) => {
        const u = (g[0] as Linha & { _txt?: string })._txt ?? "";
        return t === u || t.includes(u) || u.includes(t);
      });
      if (achado) achado.push(o); else grupos.push([o]);
    }
    return grupos;
  };

  for (const balde of porTexto.values())
  for (const g of clusterizar(balde)) {
    if (g.length < 2) continue;
    const ordenado = [...g].sort((a, b) => quando(b).localeCompare(quando(a)));
    const mantido = ordenado[0];
    // ★ FICA O MAIS RECENTE, e não o mais antigo como fazia a guarda da era
    // Brasil. Lá o motivo era não desbancar um anúncio já aprovado ou
    // compartilhado na plataforma; aqui nada é aprovado à mão, e o preço do
    // mais recente é o preço que vale hoje — que é o produto.
    for (const o of ordenado.slice(1)) {
      if (jaMarcado.has(o.id)) continue;
      if (o.preco !== mantido.preco) precoMudou++;
      if (o.duplicata_de !== mantido.id) marcar.push({ id: o.id, duplicata_de: mantido.id });
      jaMarcado.add(o.id);
    }
  }
  // ⚠️ Conta CLUSTERS e não BALDES: balde é modelo+ano+cidade e quase sempre
  // tem mais de um anúncio, então contar balde dava 214 e não significava nada.
  const gruposTexto = [...porTexto.values()].flatMap(clusterizar).filter((g) => g.length > 1).length;
  console.log(`passo 2 (mesma descrição, preço livre): ${gruposTexto} grupo(s), ${precoMudou} com PREÇO DIFERENTE`);

  const comRepeticao = [...grupos.values()].filter((g) => g.length > 1);
  console.log(`${comRepeticao.length} carros republicados · ${marcar.length} a marcar · ${desmarcar.length} a liberar`);
  console.log(`maior grupo: ${maiorGrupo} publicações do mesmo carro\n`);

  comRepeticao.sort((a, b) => b.length - a.length).slice(0, 6).forEach((g) => {
    console.log(`  ${String(g.length).padStart(2)}x ${String(g[0].veiculo).slice(0, 40).padEnd(40)} ${Number(g[0].preco).toLocaleString("es-PY")} ${g[0].moeda} · ${g[0].cidade}`);
  });

  if (!APLICAR) { console.log("\n(seco — nada mudou. Use --aplicar.)"); return; }

  const LOTE = 200;
  for (let i = 0; i < marcar.length; i += LOTE) {
    const fatia = marcar.slice(i, i + LOTE);
    // ⚠️ Um update por destino: o PostgREST não faz "update ... from values".
    // Agrupa por `duplicata_de` para não mandar uma chamada por linha.
    const porDestino = new Map<string, string[]>();
    for (const m of fatia) porDestino.set(m.duplicata_de, [...(porDestino.get(m.duplicata_de) ?? []), m.id]);
    for (const [destino, ids] of porDestino) {
      const { error } = await supabase.from("opportunities").update({ duplicata_de: destino }).in("id", ids);
      if (error) throw new Error(`marcar: ${error.message}`);
    }
  }
  for (let i = 0; i < desmarcar.length; i += LOTE) {
    const { error } = await supabase.from("opportunities").update({ duplicata_de: null }).in("id", desmarcar.slice(i, i + LOTE));
    if (error) throw new Error(`liberar: ${error.message}`);
  }
  console.log(`\n✓ ${marcar.length} marcado(s) como reanúncio · ${desmarcar.length} liberado(s)`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
