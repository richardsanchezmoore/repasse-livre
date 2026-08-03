import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in · The Courtship Almanac" };

export default function LoginPage() {
  return (
    <main className="lp">
      <div className="lp-hero">
        <div className="eyebrow">◈ The Courtship Almanac ◈</div>
        <h1 className="lp-title">Welcome <em>back</em>.</h1>
        <p className="lp-sub">Log in with the email and password you created.</p>
      </div>
      <section className="card" style={{ margin: "6px 18px" }}>
        <div className="c-k">Log in</div>
        <LoginForm />
        <p className="opt" style={{ marginTop: 12 }}>Just bought and haven't set a password? <a href="/welcome" style={{ color: "var(--wine)" }}>Create your access</a>.</p>
      </section>
    </main>
  );
}
