import BemVindaAcesso from "@/components/BemVindaAcesso";
import InstalarApp from "@/components/InstalarApp";

// Post-compra México (/es/bienvenida). Hotmart redirige aquí tras el pago (con
// ?pago=1 para ir directo a crear la contraseña). Reutiliza el mismo componente de
// acceso del BR (backend compartido). El webhook /api/hotmart crea la cuenta+acceso.
export const dynamic = "force-dynamic";
export const metadata = { title: "Bienvenida a Damas Virtuosas", robots: { index: false, follow: false } };

export default function Bienvenida({ searchParams }) {
  const chaves = ["email", "e-mail", "customer_email", "customerEmail", "buyer_email", "mail"];
  let email = "";
  for (const k of chaves) {
    const v = searchParams?.[k];
    if (typeof v === "string" && v.includes("@")) { email = v.trim(); break; }
  }
  return (
    <main className="lp">
      <div className="lp-hero">
        <div className="eyebrow">◈ Compra confirmada ◈</div>
        <h1 className="lp-title">Bienvenida, <em>dama virtuosa</em>.</h1>
        <p className="lp-sub">Tu cuenta y tu <strong>Kit</strong> ya están listos. Crea una contraseña y entra <em>al instante</em> — sin esperar correo.</p>
      </div>

      <section className="card" style={{ margin: "6px 18px" }}>
        <div className="c-k">Crea tu acceso</div>
        <BemVindaAcesso emailInicial={email} />
        <p className="opt" style={{ marginTop: 12 }}>Usa el mismo correo de la compra. Solo define la contraseña — nada de enlaces por correo.</p>
      </section>

      <div style={{ margin: "0 18px" }}>
        <InstalarApp titulo="📲 Deja Damas Virtuosas en tu pantalla de inicio" />
      </div>

      <div className="lp-final">
        <p className="muted">¿Ya tienes contraseña? <a href="/entrar" style={{ color: "var(--wine)", borderBottom: "1px solid var(--gold)" }}>Entrar</a></p>
      </div>
    </main>
  );
}
