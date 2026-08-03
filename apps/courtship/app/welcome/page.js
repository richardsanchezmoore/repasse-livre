import WelcomeAccess from "./WelcomeAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to The Courtship Almanac" };

export default function Welcome({ searchParams }) {
  // Accept common email query keys so the field comes pre-filled (fewer typos).
  const chaves = ["email", "e-mail", "customer_email", "customerEmail", "buyer_email", "mail"];
  let email = "";
  for (const k of chaves) {
    const v = searchParams?.[k];
    if (typeof v === "string" && v.includes("@")) { email = v.trim(); break; }
  }
  return (
    <main className="lp">
      <div className="lp-hero">
        <div className="eyebrow">◈ Order confirmed ◈</div>
        <h1 className="lp-title">Welcome, <em>virtuous lady</em>.</h1>
        <p className="lp-sub">Your account and your <strong>Kit</strong> are ready. Create a password and step in <em>right now</em> — no waiting on email.</p>
      </div>

      <section className="card" style={{ margin: "6px 18px" }}>
        <div className="c-k">Create your access</div>
        <WelcomeAccess emailInicial={email} />
        <p className="opt" style={{ marginTop: 12 }}>Use the same email as your purchase. Just set a password — no link to hunt for.</p>
      </section>

      <div className="lp-final">
        <p className="muted">Already have a password? <a href="/login" style={{ color: "var(--wine)", borderBottom: "1px solid var(--gold)" }}>Log in</a></p>
      </div>
    </main>
  );
}
