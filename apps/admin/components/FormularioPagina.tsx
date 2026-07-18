"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, Eye } from "lucide-react";
import { EditorTiptap } from "@/components/EditorTiptap";
import { salvarPagina, type ResultadoPost } from "@/lib/cmsActions";

export interface PaginaEditor {
  slug: string;
  titulo: string;
  conteudoJson: unknown;
  conteudoHtml: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

const INICIAL: ResultadoPost = { erro: null, sucesso: false };
const LIM_SEO_TITLE = 60;
const LIM_SEO_DESC = 160;

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="cms-salvar" disabled={pending}>
      {pending ? <><Loader2 size={16} className="editor-spin" /> Salvando…</> : "Salvar"}
    </button>
  );
}

export function FormularioPagina({ pagina }: { pagina: PaginaEditor }) {
  const [estado, acao] = useFormState(salvarPagina, INICIAL);
  const [json, setJson] = useState<unknown>(pagina.conteudoJson ?? null);
  const [seoTitle, setSeoTitle] = useState(pagina.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(pagina.seoDescription ?? "");

  return (
    <form action={acao} className="cms-form">
      <input type="hidden" name="slug" value={pagina.slug} />
      <input type="hidden" name="conteudo_json" value={JSON.stringify(json)} />

      {estado.erro && <p className="cms-erro">{estado.erro}</p>}
      {estado.sucesso && <p className="cms-ok">Salvo! A página pública foi atualizada.</p>}

      <div className="cms-grid">
        <div className="cms-coluna-principal">
          <label className="cms-campo">
            <span className="cms-label">Título da página</span>
            <input name="titulo" defaultValue={pagina.titulo} className="cms-input cms-input-titulo" required />
          </label>

          <div className="cms-campo">
            <span className="cms-label">Conteúdo</span>
            {/* Páginas migradas do hardcode só têm HTML (conteudo_json null) → o editor
                bootstrapa do HTML no 1º open; ao salvar, passa a ter JSON também. */}
            <EditorTiptap jsonInicial={pagina.conteudoJson ?? null} htmlInicial={pagina.conteudoHtml} onChange={setJson} />
          </div>
        </div>

        <aside className="cms-coluna-lateral">
          <div className="cms-bloco">
            <span className="cms-bloco-titulo">Publicação</span>
            <BotaoSalvar />
            <a href={`/${pagina.slug}`} target="_blank" rel="noopener noreferrer" className="cms-btn-sec">
              <Eye size={14} /> Ver página
            </a>
          </div>

          <div className="cms-bloco">
            <span className="cms-bloco-titulo">SEO</span>
            <label className="cms-campo-min">
              <span className="cms-label-min">Título SEO <em className={seoTitle.length > LIM_SEO_TITLE ? "cms-over" : ""}>{seoTitle.length}/{LIM_SEO_TITLE}</em></span>
              <input name="seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="cms-input" />
            </label>
            <label className="cms-campo-min">
              <span className="cms-label-min">Descrição SEO <em className={seoDesc.length > LIM_SEO_DESC ? "cms-over" : ""}>{seoDesc.length}/{LIM_SEO_DESC}</em></span>
              <textarea name="seo_description" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} className="cms-input" rows={3} />
            </label>
            <div className="cms-snippet">
              <span className="cms-snippet-url">repasselivre.com › {pagina.slug}</span>
              <span className="cms-snippet-titulo">{seoTitle || pagina.titulo}</span>
              <span className="cms-snippet-desc">{seoDesc || "A descrição que aparece no Google."}</span>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
