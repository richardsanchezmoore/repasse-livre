"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon, Undo, Redo, Loader2,
} from "lucide-react";
import { extensoesTiptap } from "@/lib/tiptapExtensions";

/**
 * Editor rich text (Tiptap) do CMS. Emite o JSON (fonte da verdade) via onChange; o
 * formulário serializa num hidden e a server action gera o HTML sanitizado no servidor.
 * Upload de imagem reusa /api/fotos (sharp + Supabase Storage). immediatelyRender:false
 * é obrigatório no Next (SSR) pra não dar mismatch de hidratação.
 */
export function EditorTiptap({
  jsonInicial,
  onChange,
}: {
  jsonInicial: unknown;
  onChange: (json: unknown) => void;
}) {
  const [enviandoImg, setEnviandoImg] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [...extensoesTiptap, Placeholder.configure({ placeholder: "Escreva o conteúdo aqui…" })],
    content: (jsonInicial as Record<string, unknown>) ?? "",
    immediatelyRender: false,
    editorProps: { attributes: { class: "editor-conteudo" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  const enviarImagem = useCallback(
    async (file: File) => {
      if (!editor) return;
      setEnviandoImg(true);
      try {
        const fd = new FormData();
        fd.append("foto", file);
        const resp = await fetch("/api/fotos", { method: "POST", body: fd });
        if (!resp.ok) throw new Error("upload falhou");
        const { url } = (await resp.json()) as { url: string };
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        alert("Não consegui enviar a imagem. Tente outra.");
      } finally {
        setEnviandoImg(false);
      }
    },
    [editor],
  );

  const definirLink = useCallback(() => {
    if (!editor) return;
    const atual = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Endereço do link (https://…):", atual ?? "https://");
    if (url === null) return; // cancelou
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return <div className="editor-carregando">Carregando editor…</div>;

  return (
    <div className="editor-tiptap">
      <div className="editor-barra">
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleBold().run()} ativo={editor.isActive("bold")} titulo="Negrito"><Bold size={16} /></BtnBarra>
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleItalic().run()} ativo={editor.isActive("italic")} titulo="Itálico"><Italic size={16} /></BtnBarra>
        <span className="editor-sep" />
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} ativo={editor.isActive("heading", { level: 2 })} titulo="Título"><Heading2 size={16} /></BtnBarra>
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} ativo={editor.isActive("heading", { level: 3 })} titulo="Subtítulo"><Heading3 size={16} /></BtnBarra>
        <span className="editor-sep" />
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleBulletList().run()} ativo={editor.isActive("bulletList")} titulo="Lista"><List size={16} /></BtnBarra>
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleOrderedList().run()} ativo={editor.isActive("orderedList")} titulo="Lista numerada"><ListOrdered size={16} /></BtnBarra>
        <BtnBarra editor={editor} cmd={() => editor.chain().focus().toggleBlockquote().run()} ativo={editor.isActive("blockquote")} titulo="Citação"><Quote size={16} /></BtnBarra>
        <span className="editor-sep" />
        <BtnBarra editor={editor} cmd={definirLink} ativo={editor.isActive("link")} titulo="Link"><LinkIcon size={16} /></BtnBarra>
        <button type="button" className="editor-btn" title="Imagem" disabled={enviandoImg} onClick={() => inputRef.current?.click()}>
          {enviandoImg ? <Loader2 size={16} className="editor-spin" /> : <ImageIcon size={16} />}
        </button>
        <span className="editor-sep" />
        <button type="button" className="editor-btn" title="Desfazer" onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></button>
        <button type="button" className="editor-btn" title="Refazer" onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviarImagem(f);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function BtnBarra({
  cmd,
  ativo,
  titulo,
  children,
}: {
  editor: Editor;
  cmd: () => void;
  ativo: boolean;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`editor-btn ${ativo ? "editor-btn-ativo" : ""}`} title={titulo} onClick={cmd}>
      {children}
    </button>
  );
}
