import "server-only";
import { generateHTML } from "@tiptap/html";
import sanitizeHtml from "sanitize-html";
import { extensoesTiptap } from "./tiptapExtensions";

/**
 * Converte o JSON do Tiptap (fonte da verdade) em HTML SEGURO pra guardar/servir.
 * Roda NO SERVIDOR (o @tiptap/html tem DOM próprio, não precisa de jsdom). Nunca
 * confiar no HTML vindo do client → gera do JSON aqui e SANITIZA (mata XSS: script,
 * on*, javascript:). Links ganham rel/target seguros. Ver a memória do CMS/blog.
 */

const TAGS_PERMITIDAS = [
  "p", "h1", "h2", "h3", "h4", "strong", "em", "u", "s",
  "a", "ul", "ol", "li", "blockquote", "code", "pre", "hr", "br", "img",
];

export function jsonParaHtmlSeguro(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  let bruto: string;
  try {
    // generateHTML espera um doc ProseMirror (JSONContent). Cast controlado.
    bruto = generateHTML(doc as Parameters<typeof generateHTML>[0], extensoesTiptap);
  } catch (e) {
    console.error("[cms] generateHTML falhou:", e instanceof Error ? e.message : e);
    return "";
  }
  return sanitizeHtml(bruto, {
    allowedTags: TAGS_PERMITIDAS,
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt"],
      // classe só a que o nosso editor injeta (Image) — nada de style/on*.
      "*": ["class"],
    },
    allowedClasses: { img: ["post-img"], "*": [] },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      // Link externo seguro (sem vazar referrer, sem passar SEO).
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
}
