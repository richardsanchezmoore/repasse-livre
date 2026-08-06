import { listaPorToken } from "@/lib/listas";
import ListaPublica from "@/components/ListaPublica";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lista compartilhada · Marta" };

export default async function ListaLinkPublico({ params }) {
  const lista = await listaPorToken(params.token);
  if (!lista) {
    return <main className="screen"><p className="muted" style={{ textAlign: "center", marginTop: 40 }}>Esta lista não existe mais. 💛</p></main>;
  }
  return (
    <main className="screen">
      <div className="eyebrow">📝 Lista compartilhada</div>
      <h1 className="h">{lista.tipo === "tarefas" ? "✅" : "🛒"} {lista.titulo}</h1>
      <p className="sub">Marque o que já pegou/fez — todo mundo vê junto. 💛</p>
      <ListaPublica token={params.token} itensIniciais={lista.itens} />
    </main>
  );
}
