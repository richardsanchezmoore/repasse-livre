"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, ImagePlus, Trash2 } from "lucide-react";
import { EditorTiptap } from "@/components/EditorTiptap";
import { salvarPost, apagarPost, type ResultadoPost } from "@/lib/cmsActions";
import { slugify } from "@/lib/slug";

export interface PostEditor {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudoJson: unknown;
  capaUrl: string | null;
  capaAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: "rascunho" | "publicado";
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

export function FormularioPost({ post }: { post?: PostEditor | null }) {
  const [estado, acao] = useFormState(salvarPost, INICIAL);
  const [titulo, setTitulo] = useState(post?.titulo ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTocado, setSlugTocado] = useState(Boolean(post?.slug));
  const [json, setJson] = useState<unknown>(post?.conteudoJson ?? null);
  const [capaUrl, setCapaUrl] = useState(post?.capaUrl ?? "");
  const [enviandoCapa, setEnviandoCapa] = useState(false);
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(post?.seoDescription ?? "");
  const [status, setStatus] = useState<"rascunho" | "publicado">(post?.status ?? "rascunho");
  const capaInputRef = useRef<HTMLInputElement>(null);

  // Slug acompanha o título até o usuário editar o slug à mão.
  useEffect(() => {
    if (!slugTocado) setSlug(slugify(titulo));
  }, [titulo, slugTocado]);

  async function enviarCapa(file: File) {
    setEnviandoCapa(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const resp = await fetch("/api/fotos", { method: "POST", body: fd });
      if (!resp.ok) throw new Error();
      const { url } = (await resp.json()) as { url: string };
      setCapaUrl(url);
    } catch {
      alert("Não consegui enviar a capa.");
    } finally {
      setEnviandoCapa(false);
    }
  }

  const previewTitle = seoTitle || titulo || "Título do post";
  const previewDesc = seoDesc || post?.resumo || "A descrição que aparece no Google vem daqui.";

  return (
    <form action={acao} className="cms-form">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="conteudo_json" value={JSON.stringify(json)} />
      <input type="hidden" name="capa_url" value={capaUrl} />
      <input type="hidden" name="status" value={status} />

      {estado.erro && <p className="cms-erro">{estado.erro}</p>}
      {estado.sucesso && <p className="cms-ok">Salvo!</p>}

      <div className="cms-grid">
        <div className="cms-coluna-principal">
          <label className="cms-campo">
            <span className="cms-label">Título</span>
            <input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="cms-input cms-input-titulo" placeholder="Título do post" required />
          </label>

          <label className="cms-campo">
            <span className="cms-label">Resumo</span>
            <textarea name="resumo" defaultValue={post?.resumo ?? ""} className="cms-input" rows={2} placeholder="Uma linha que aparece na lista do blog e no Google (opcional)." />
          </label>

          <div className="cms-campo">
            <span className="cms-label">Conteúdo</span>
            <EditorTiptap jsonInicial={post?.conteudoJson ?? null} onChange={setJson} />
          </div>
        </div>

        <aside className="cms-coluna-lateral">
          {/* Publicação */}
          <div className="cms-bloco">
            <span className="cms-bloco-titulo">Publicação</span>
            <div className="cms-status">
              <label className={status === "rascunho" ? "cms-status-sel" : ""}>
                <input type="radio" checked={status === "rascunho"} onChange={() => setStatus("rascunho")} /> Rascunho
              </label>
              <label className={status === "publicado" ? "cms-status-sel" : ""}>
                <input type="radio" checked={status === "publicado"} onChange={() => setStatus("publicado")} /> Publicado
              </label>
            </div>
            <BotaoSalvar />
            {post?.id && (
              <button
                type="button"
                className="cms-apagar"
                onClick={() => { if (confirm("Apagar este post?")) apagarPost(post.id); }}
              >
                <Trash2 size={14} /> Apagar
              </button>
            )}
          </div>

          {/* Capa */}
          <div className="cms-bloco">
            <span className="cms-bloco-titulo">Capa</span>
            {capaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capaUrl} alt="" className="cms-capa-preview" />
            ) : (
              <div className="cms-capa-vazia">Sem capa</div>
            )}
            <button type="button" className="cms-btn-sec" disabled={enviandoCapa} onClick={() => capaInputRef.current?.click()}>
              {enviandoCapa ? <Loader2 size={14} className="editor-spin" /> : <ImagePlus size={14} />} {capaUrl ? "Trocar" : "Enviar capa"}
            </button>
            <input ref={capaInputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarCapa(f); e.target.value = ""; }} />
            <input name="capa_alt" defaultValue={post?.capaAlt ?? ""} className="cms-input" placeholder="Descrição da capa (alt)" />
          </div>

          {/* Endereço / SEO */}
          <div className="cms-bloco">
            <span className="cms-bloco-titulo">Endereço &amp; SEO</span>
            <label className="cms-campo-min">
              <span className="cms-label-min">Slug (endereço)</span>
              <div className="cms-slug"><span>/blog/</span>
                <input name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTocado(true); }} className="cms-input" />
              </div>
            </label>
            <label className="cms-campo-min">
              <span className="cms-label-min">Título SEO <em className={seoTitle.length > LIM_SEO_TITLE ? "cms-over" : ""}>{seoTitle.length}/{LIM_SEO_TITLE}</em></span>
              <input name="seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="cms-input" placeholder="Cai no título do título vazio" />
            </label>
            <label className="cms-campo-min">
              <span className="cms-label-min">Descrição SEO <em className={seoDesc.length > LIM_SEO_DESC ? "cms-over" : ""}>{seoDesc.length}/{LIM_SEO_DESC}</em></span>
              <textarea name="seo_description" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} className="cms-input" rows={3} placeholder="Some no resumo se vazio." />
            </label>
            {/* Preview do snippet do Google */}
            <div className="cms-snippet">
              <span className="cms-snippet-url">repasselivre.com › blog › {slug || "…"}</span>
              <span className="cms-snippet-titulo">{previewTitle}</span>
              <span className="cms-snippet-desc">{previewDesc}</span>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
