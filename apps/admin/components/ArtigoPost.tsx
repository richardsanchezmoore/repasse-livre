/**
 * Renderiza o artigo de um post (capa, título, data, corpo). Compartilhado entre a
 * página pública /blog/[slug] e a PRÉVIA admin — assim a prévia é fiel ao que sai no
 * ar. O conteudoHtml já vem gerado e SANITIZADO no servidor ao salvar (lib/tiptapHtml).
 */
export function ArtigoPost({
  titulo,
  capaUrl,
  capaAlt,
  dataLabel,
  conteudoHtml,
}: {
  titulo: string;
  capaUrl: string | null;
  capaAlt: string | null;
  dataLabel: string | null;
  conteudoHtml: string;
}) {
  return (
    <article className="post">
      {capaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={capaUrl} alt={capaAlt ?? ""} className="post-capa" />
      )}
      <h1 className="post-titulo">{titulo}</h1>
      {dataLabel && <p className="post-data">{dataLabel}</p>}
      <div className="post-corpo" dangerouslySetInnerHTML={{ __html: conteudoHtml }} />
    </article>
  );
}
