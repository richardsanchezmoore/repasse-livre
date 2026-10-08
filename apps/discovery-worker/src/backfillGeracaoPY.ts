import "dotenv/config";
import { supabase } from "./supabaseClient.js";
import { conferirAnoModelo } from "./anoModeloPY.js";
import { geracaoDoAno, coberturaGeracoes } from "./geracoesPY.js";

/**
 * BACKFILL de `geracao` e `ano_suspeito` (migração 0091).
 *
 * ★ Por que existe: as duas colunas nasceram em 08/10/2026 e a captação só
 * passou a preenchê-las a partir dali. Tudo que já estava no banco — e tudo que
 * a varredura por termo trouxe na madrugada, que subiu antes da mudança — está
 * sem elas.
 *
 * ⚠️ NÃO TOCA EM PREÇO, MODELO NEM NADA MAIS. Escreve exatamente duas colunas
 * derivadas de dado que já está na linha (modelo + ano). É reexecutável e não
 * destrói nada: rodar duas vezes dá o mesmo resultado, e se o dicionário de
 * gerações crescer, rodar de novo melhora a cobertura.
 *
 * ⚠️ `ano_suspeito` SINALIZA, não rejeita — ver geracoesPY e anoModeloPY. Aqui
 * ele só é gravado; nenhuma linha é apagada ou escondida por causa dele.
 */
const LOTE = 200;

async function main() {
  const cob = coberturaGeracoes();
  console.log(`dicionário: ${cob.modelos} modelo(s), ${cob.geracoes} geração(ões), ${cob.firmes} firme(s)\n`);

  const { data, error } = await supabase
    .from("opportunities")
    .select("id, modelo, ano, geracao, ano_suspeito")
    .eq("pais", "PY")
    .not("modelo", "is", null);
  if (error) throw new Error(error.message);
  const linhas = data ?? [];

  const mudancas: { id: string; geracao: string | null; ano_suspeito: boolean }[] = [];
  let comGeracao = 0, suspeitos = 0;

  for (const o of linhas) {
    const modelo = String(o.modelo).toLowerCase();
    const ano = o.ano == null ? null : Number(o.ano);
    const ger = geracaoDoAno(modelo, Number.isFinite(ano) ? ano : null);
    const conf = conferirAnoModelo(modelo, Number.isFinite(ano) ? ano : null);
    const novaGeracao = ger?.codigo ?? null;
    // ⚠️ SÓ as duas que são erro DO ANÚNCIO. "modelo_sem_faixa" é o nosso
    // dicionário que não cobre o modelo, e "ano_ausente" é anúncio sem ano —
    // nenhuma das duas é ano suspeito. A primeira versão disto usou
    // `problema !== null` e marcou 178 de 306 (58%) da base, inclusive Gol,
    // Camaro e Mustang, que nem entrada no dicionário têm.
    const novoSuspeito = conf.problema === "antes_de_existir" || conf.problema === "depois_do_fim";

    if (novaGeracao) comGeracao++;
    if (novoSuspeito) suspeitos++;

    // Só escreve o que de fato muda: linha já correta não gera tráfego.
    if (novaGeracao !== (o.geracao ?? null) || novoSuspeito !== (o.ano_suspeito ?? false)) {
      mudancas.push({ id: String(o.id), geracao: novaGeracao, ano_suspeito: novoSuspeito });
    }
  }

  console.log(`${linhas.length} anúncios PY com modelo`);
  console.log(`  ${comGeracao} caem numa geração conhecida`);
  console.log(`  ${suspeitos} com ano fora da produção do modelo (sinalizados, não removidos)`);
  console.log(`  ${mudancas.length} linha(s) a atualizar\n`);

  // ⚠️ NÃO sai cedo quando não há o que gravar: o relatório de cobertura lá
  // embaixo é o motivo de rodar isto numa base já preenchida, e a primeira
  // versão o escondia atrás de um `return` quando não havia mudança.
  let feitas = 0;
  for (let i = 0; mudancas.length && i < mudancas.length; i += LOTE) {
    const fatia = mudancas.slice(i, i + LOTE);
    // ⚠️ Um update por linha: `upsert` em lote exigiria mandar a linha INTEIRA,
    // e qualquer coluna que eu esquecesse viraria null. Mais chamadas, zero
    // risco de apagar dado por omissão.
    for (const m of fatia) {
      const { error: e } = await supabase
        .from("opportunities")
        .update({ geracao: m.geracao, ano_suspeito: m.ano_suspeito })
        .eq("id", m.id);
      if (e) { console.log(`  ✗ ${m.id}: ${e.message}`); continue; }
      feitas++;
    }
    console.log(`  ${feitas}/${mudancas.length}`);
  }

  // ★ O QUE ISTO DESTRAVA — e a medida tem que ser honesta.
  //
  // ⚠️ A primeira versão comparava "grupos publicáveis por modelo+ano" (17 de
  // 218) com "por modelo+geração" (15 de 18) e isso NÃO SE COMPARA: são
  // universos diferentes, porque só 18 modelos têm geração no dicionário. O
  // número parecia espetacular e não queria dizer nada.
  //
  // A pergunta certa é sobre ANÚNCIOS, não sobre grupos: dos carros que têm
  // geração conhecida, quantos caem num agrupamento com ofertas suficientes
  // para publicar mediana? Aí os dois lados olham exatamente o mesmo conjunto.
  const comGer = linhas.filter((o) => geracaoDoAno(String(o.modelo).toLowerCase(), o.ano == null ? null : Number(o.ano)));
  const contar = (chave: (o: (typeof linhas)[number]) => string | null) => {
    const grupos = new Map<string, number>();
    for (const o of comGer) {
      const k = chave(o);
      if (k) grupos.set(k, (grupos.get(k) ?? 0) + 1);
    }
    const cobertos = [...grupos.values()].filter((n) => n >= 3).reduce((a, b) => a + b, 0);
    return { grupos: grupos.size, publicaveis: [...grupos.values()].filter((n) => n >= 3).length, cobertos };
  };
  const porAno = contar((o) => (o.ano ? `${String(o.modelo).toLowerCase()}|${o.ano}` : null));
  const porGer = contar((o) => {
    const g = geracaoDoAno(String(o.modelo).toLowerCase(), o.ano == null ? null : Number(o.ano));
    return g ? `${String(o.modelo).toLowerCase()}|${g.codigo}` : null;
  });

  console.log(`\n★ MESMO conjunto (${comGer.length} anúncios com geração conhecida), dois agrupamentos:`);
  console.log(`   por modelo+ano:     ${porAno.publicaveis} grupo(s) de ${porAno.grupos} com 3+ ofertas → ${porAno.cobertos} anúncios com mediana publicável`);
  console.log(`   por modelo+geração: ${porGer.publicaveis} grupo(s) de ${porGer.grupos} com 3+ ofertas → ${porGer.cobertos} anúncios com mediana publicável`);
  const ganho = porAno.cobertos ? ((porGer.cobertos / porAno.cobertos - 1) * 100).toFixed(0) : "—";
  console.log(`   ganho de cobertura: ${ganho}%`);
}

main().catch((e) => { console.error("falhou:", e.message); process.exitCode = 1; });
