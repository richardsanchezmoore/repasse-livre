import "dotenv/config";
import fs from "node:fs";
import { supabase } from "./supabaseClient.js";

/**
 * ★★ CRIA AS TRÊS PÁGINAS LEGAIS no CMS.
 *
 * ⚠️⚠️ Achado em 16/10/2026 conferindo os links do rodapé: `/privacidade`,
 * `/termos` e `/exclusao-de-dados` devolviam **404 em produção**. Os arquivos
 * de rota existem; o que faltava era a LINHA NO BANCO — as páginas leem o
 * conteúdo da tabela `paginas` do CMS e chamam `notFound()` quando o slug não
 * está lá. A tabela estava vazia (zero linhas): o conteúdo era da era Repasse
 * Livre e nunca foi recriado para o Paraguai.
 *
 * ★ Três 404 no rodapé de TODA página é o tipo de coisa que o Search Console
 * acusa no primeiro rastreamento, e a de exclusão de dados é exigida pelo
 * login do Facebook.
 *
 * ⚠️ Conteúdo em ESPANHOL, que é o idioma da raiz do site. A tabela `paginas`
 * não tem coluna de idioma, então /pt serve o mesmo texto por enquanto — é a
 * mesma limitação já anotada para `seo_paginas`, e resolver exige migração.
 *
 * ⚠️ O e-mail `contacto@autoradarpy.com` precisa EXISTIR. Página legal que
 * manda escrever para uma caixa que ninguém lê é pior que não ter página.
 *
 * Uso: npx tsx src/semearPaginasLegaisPY.ts [--aplicar]
 */
const APLICAR = process.argv.includes("--aplicar");
const DIR = process.env.PY_DIR_PAGINAS ?? "";

const PAGINAS = [
  {
    slug: "privacidade",
    arquivo: "privacidade.html",
    titulo: "Política de Privacidad",
    seoTitle: "Política de Privacidad — AutoRadarPy",
    seoDescription: "Qué datos trata AutoRadarPy, para qué, con quién se comparten y cómo pedir su eliminación.",
  },
  {
    slug: "termos",
    arquivo: "termos.html",
    titulo: "Términos de Uso",
    seoTitle: "Términos de Uso — AutoRadarPy",
    seoDescription: "Condiciones de uso de AutoRadarPy: qué es el servicio, qué son los precios de referencia y qué responsabilidad asume cada parte.",
  },
  {
    slug: "exclusao-de-dados",
    arquivo: "exclusao.html",
    titulo: "Eliminación de Datos",
    seoTitle: "Eliminación de Datos — AutoRadarPy",
    seoDescription: "Cómo eliminar su cuenta de AutoRadarPy y los datos asociados.",
  },
];

async function main() {
  if (!DIR) { console.log("Defina PY_DIR_PAGINAS com a pasta dos .html"); return; }
  for (const p of PAGINAS) {
    const caminho = `${DIR}/${p.arquivo}`;
    if (!fs.existsSync(caminho)) { console.log(`✗ ${p.slug}: falta ${caminho}`); continue; }
    const html = fs.readFileSync(caminho, "utf8").trim();
    const { data: existe } = await supabase.from("paginas").select("slug").eq("slug", p.slug).maybeSingle();
    console.log(`${p.slug.padEnd(20)} ${existe ? "JÁ EXISTE (será atualizada)" : "nova"} · ${html.length} caracteres`);
    if (!APLICAR) continue;
    const { error } = await supabase.from("paginas").upsert(
      {
        slug: p.slug,
        titulo: p.titulo,
        conteudo_html: html,
        // ⚠️ `conteudo_json` fica null: o Tiptap do painel reconstrói a partir
        // do HTML na primeira edição. Gravar um doc inventado aqui seria pior.
        seo_title: p.seoTitle,
        seo_description: p.seoDescription,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    console.log(error ? `  ✗ ${error.message.slice(0, 70)}` : "  ✓ gravada");
  }
  if (!APLICAR) console.log("\n(seco — nada gravado. Use --aplicar.)");
}

main().catch((e) => { console.error(e); process.exit(1); });
