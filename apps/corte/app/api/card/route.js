import { criarCartao } from "@/lib/caktoApi";

// POST /api/card — finaliza o pagamento com cartão. O browser (SDK Cakto) já
// tokenizou o cartão e rodou o antifraude; aqui só recebemos o token + a
// referência do antifraude e disparamos a cobrança. Resposta é síncrona.
// Body: { nome, email, cpf, whatsapp, fingerprint, cardToken, antifraudRef, installments, metadata? }
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function soDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

export async function POST(req) {
  const b = await req.json().catch(() => ({}));

  const nome = String(b.nome || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const cpf = soDigitos(b.cpf);
  let tel = soDigitos(b.whatsapp);
  if (tel && !tel.startsWith("55")) tel = "55" + tel;

  if (nome.length < 2 || !email.includes("@") || cpf.length !== 11 || tel.length < 12) {
    return Response.json({ ok: false, erro: "Preencha nome, e-mail, CPF e WhatsApp." }, { status: 400 });
  }
  if (!b.cardToken || !b.antifraudRef) {
    return Response.json({ ok: false, erro: "Dados do cartão incompletos. Tente novamente." }, { status: 400 });
  }

  const r = await criarCartao({
    nome,
    email,
    cpf,
    telefone: tel,
    fingerprint: b.fingerprint,
    cardToken: b.cardToken,
    antifraudRef: b.antifraudRef,
    installments: b.installments,
    metadata: b.metadata,
  });

  if (!r.ok) {
    console.error("[card] falha criar cobranca", r.status, JSON.stringify(r.erro));
    // Extrai mensagem amigável do erro da Cakto quando possível.
    let msg = "Não foi possível processar o cartão. Confira os dados ou tente outro.";
    const e = r.erro;
    if (e && typeof e === "object") {
      const primeira = Object.values(e).flat().find(Boolean);
      if (typeof primeira === "string") msg = primeira;
    }
    return Response.json({ ok: false, erro: msg }, { status: 502 });
  }

  // paid → sucesso. declined/refused → recusado (buyer tenta outro cartão/PIX).
  return Response.json({ ok: true, pago: r.pago, status: r.status, id: r.id, amount: r.amount });
}
