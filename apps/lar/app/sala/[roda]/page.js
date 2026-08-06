import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { contextoSala, rodaPorSlug, mensagensRecentes, bloqueadosDe } from "@/lib/sala";
import { starterDaRoda } from "@/lib/salaStarters";
import SalaChat from "@/components/SalaChat";

export const dynamic = "force-dynamic";

export default async function RodaPage({ params }) {
  const { user, perfil } = await contextoSala();
  if (!user) redirect("/entrar");
  if (!perfil?.aceitou_termo_em) redirect("/sala");

  const roda = await rodaPorSlug(params.roda);
  if (!roda) notFound();

  const [mensagens, bloqueados] = await Promise.all([
    mensagensRecentes(roda.id),
    bloqueadosDe(user.id),
  ]);

  return (
    <main className="screen sala-tela">
      <div className="sala-topo">
        <Link href="/sala" className="sala-voltar" aria-label="voltar">‹</Link>
        <div style={{ minWidth: 0 }}>
          <div className="sala-titulo">{roda.icone} {roda.nome}</div>
          <div className="muted" style={{ fontSize: 12 }}>{roda.descricao}</div>
        </div>
      </div>
      <SalaChat roda={roda} userId={user.id} mensagensIniciais={mensagens} bloqueados={bloqueados}
        starter={starterDaRoda(roda.slug)} podeDestacar={["moderadora", "admin"].includes(perfil.papel)} />
    </main>
  );
}
