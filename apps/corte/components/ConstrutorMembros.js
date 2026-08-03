"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { alternarAdmin, definirAcesso, excluirUsuario, definirSenhaMembro, criarAcessoCliente } from "@/app/admin/membros/actions";

export default function ConstrutorMembros({ membros }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [abrirNovo, setAbrirNovo] = useState(false);
  const [novo, setNovo] = useState({ email: "", senha: "", tipo: "kit" });
  const [msg, setMsg] = useState("");

  async function acao(fn) { setBusy(true); try { await fn(); router.refresh(); } finally { setBusy(false); } }

  async function excluir(m) {
    if (!confirm(`Excluir definitivamente ${m.email}?\nApaga a conta, acessos e dossiês. Não dá pra desfazer.`)) return;
    setBusy(true);
    try { const r = await excluirUsuario(m.user_id); if (r?.erro) alert(r.erro); router.refresh(); }
    finally { setBusy(false); }
  }

  async function definirSenha(m) {
    const senha = prompt(`Definir uma senha para ${m.email}\n(mín. 6 caracteres — anote para repassar ao cliente):`);
    if (senha == null) return; // cancelou
    setBusy(true);
    try {
      const r = await definirSenhaMembro(m.user_id, senha);
      if (r?.erro) { alert(r.erro); return; }
      alert(`✅ Senha definida.\n\nRepasse ao cliente:\nE-mail: ${m.email}\nSenha: ${senha}`);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function darAcesso(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const r = await criarAcessoCliente(novo);
      if (r?.erro) { setMsg(r.erro); return; }
      alert(`✅ Acesso liberado (${r.criado ? "conta criada" : "conta já existia"}).\n\nRepasse ao cliente:\nE-mail: ${novo.email}\nSenha: ${novo.senha}\nEntrar em: /entrar`);
      setNovo({ email: "", senha: "", tipo: "kit" });
      setAbrirNovo(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  const termo = q.trim().toLowerCase();
  const lista = termo ? membros.filter((m) => (m.email + " " + (m.nome || "")).toLowerCase().includes(termo)) : membros;

  return (
    <div>
      {/* Dar acesso a um cliente: cria a conta se não existir + define a senha + concede o acesso */}
      <button type="button" className="chip" disabled={busy} onClick={() => { setAbrirNovo((v) => !v); setMsg(""); }}>
        {abrirNovo ? "✕ Fechar" : "＋ Dar acesso a um cliente"}
      </button>
      {abrirNovo && (
        <form onSubmit={darAcesso} className="memb" style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <input className="fld" type="email" placeholder="E-mail do cliente" value={novo.email} required
            onChange={(e) => setNovo({ ...novo, email: e.target.value })} />
          <input className="fld" type="text" placeholder="Senha (mín. 6 — você repassa ao cliente)" value={novo.senha} required
            onChange={(e) => setNovo({ ...novo, senha: e.target.value })} />
          <select className="fld" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
            <option value="kit">📕 Kit (vitalício)</option>
            <option value="assinatura">✦ Assinatura (35 dias)</option>
          </select>
          {msg && <p className="fld-err">{msg}</p>}
          <button type="submit" className="chip on" disabled={busy} style={{ justifyContent: "center" }}>
            {busy ? "Liberando…" : "Liberar acesso"}
          </button>
        </form>
      )}

      <input className="fld" placeholder="Buscar por e-mail ou nome…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 12 }} />
      <div className="shelf" style={{ marginTop: 12 }}>
        {lista.map((m) => (
          <div key={m.user_id} className="memb">
            <div className="memb-top">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="memb-nome">{m.nome || "sem nome"}{m.is_admin && <span className="tag" style={{ marginLeft: 6 }}>ADMIN</span>}</div>
                <div className="memb-email">{m.email}</div>
              </div>
              <div className="memb-dos">{m.dossies} 🗂️</div>
            </div>
            <div className="memb-chips">
              <button type="button" className={"chip" + (m.kit ? " on" : "")} disabled={busy} onClick={() => acao(() => definirAcesso(m.user_id, "kit", !m.kit))}>📕 Kit</button>
              <button type="button" className={"chip" + (m.assinatura ? " on" : "")} disabled={busy} onClick={() => acao(() => definirAcesso(m.user_id, "assinatura", !m.assinatura))}>✦ Assinatura</button>
              <button type="button" className={"chip" + (m.is_admin ? " on" : "")} disabled={busy} onClick={() => acao(() => alternarAdmin(m.user_id, !m.is_admin))}>👑 Admin</button>
              <button type="button" className="chip" disabled={busy} onClick={() => definirSenha(m)} title="Definir/redefinir senha">🔑 Senha</button>
              <button type="button" className="chip chip-del" disabled={busy} onClick={() => excluir(m)} title="Excluir usuário">🗑️ Excluir</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="muted" style={{ textAlign: "left" }}>Nenhum membro encontrado.</p>}
      </div>
    </div>
  );
}
