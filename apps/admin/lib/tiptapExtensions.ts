import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";

/**
 * Extensões do Tiptap COMPARTILHADAS entre o editor (client, @tiptap/react) e a
 * geração de HTML no servidor (@tiptap/html). Precisam ser as MESMAS — senão o mesmo
 * JSON gera HTML diferente nos dois lados. Módulo isomórfico (sem "use client"/
 * "server-only"): StarterKit/Image não tocam o DOM no import; o @tiptap/html cuida do
 * DOM no servidor. O StarterKit v3 já traz Link e Underline (não add separado).
 * Placeholder é só decoração do editor → fica no client (não afeta o HTML).
 */
export const extensoesTiptap = [
  StarterKit,
  Image.configure({ HTMLAttributes: { class: "post-img" } }),
];
