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
    if (!t || !o.cidade || !o.modelo) continue;
    const k = `${o.modelo}|${o.ano ?? ""}|${t}|${o.cidade}`;
    porTexto.set(k, [...(porTexto.get(k) ?? []), o]);
  }

  let precoMudou = 0;
  for (const g of porTexto.values()) {
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
  const gruposTexto = [...porTexto.values()].filter((g) => g.length > 1).length;
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
