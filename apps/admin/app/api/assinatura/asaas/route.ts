import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { acharOuCriarCliente, criarAssinatura, primeiraCobranca, criarAutorizacaoPixAutomatico, criarCheckout } from "@/lib/asaas";
import { buscarPrecoExibicao } from "@/lib/assinatura";
import { URL_BASE_SITE } from "@/lib/site";

/**
 * Inicia a assinatura via Asaas (API-driven — não é link fixo). Exige usuário
 * logado (a assinatura fica atrelada à conta via externalReference = user_id).
 * Cria/acha o cliente, cria a assinatura mensal e devolve a `invoiceUrl` (fatura
 * hospedada do Asaas onde o comprador paga). A liberação do premium NÃO acontece
 * aqui — é o webhook (PAYMENT_CONFIRMED/RECEIVED) que espelha o status.
 *
 * ⚠️ Pix exige o CPF do comprador na cobrança. Enquanto não houver campo de CPF
 * no checkout, o front pode mandar `cpfCnpj` no corpo (ou billingType UNDEFINED,
 * que deixa o comprador escolher o método na fatura). Ver lib/asaas.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "nao_logado" }, { status: 401 });

  let cpfCnpj: string | undefined;
  try {
    const body = (await req.json()) as { cpfCnpj?: unknown };
    if (typeof body.cpfCnpj === "string") cpfCnpj = body.cpfCnpj.replace(/\D/g, "") || undefined;
  } catch {
    /* sem corpo */
  }

  const { data: perfil } = await supabaseAdmin.from("perfis").select("nome, whatsapp").eq("user_id", usuario.id).maybeSingle();
  const preco = await buscarPrecoExibicao();
  const valorReais = Math.round(preco.centavos) / 100;

  // Modo de cobrança (env). Default = "checkout" (página hospedada do Asaas, coleta
  // CPF + recorrente, tipo Cakto). Alternativas: "assinatura" | "pix_automatico".
  const modo = process.env.ASAAS_MODO || "checkout";

  try {
    // Modo CHECKOUT (padrão) — não precisa criar cliente antes (o Asaas coleta na
    // página). externalReference=user_id casa no webhook; customerData pré-preenche.
    if (modo === "checkout") {
      const url = await criarCheckout({
        userId: usuario.id,
        valorReais,
        descricao: "Repasse Livre PRO",
        successUrl: `${URL_BASE_SITE}/bem-vindo`,
        cancelUrl: `${URL_BASE_SITE}/planos?assinatura=cancelado`,
      });
      return NextResponse.json({ url });
    }

    // Modos API-driven (assinatura / pix_automatico) precisam do cliente criado antes.
    const clienteId = await acharOuCriarCliente({
      userId: usuario.id,
      nome: (perfil?.nome as string) || usuario.email || "Assinante",
      email: usuario.email ?? "",
      cpfCnpj,
      telefone: (perfil?.whatsapp as string) || undefined,
    });

    // Modo PIX AUTOMÁTICO (débito recorrente real) — quando ASAAS_MODO=pix_automatico
    // e a conta é elegível. Cria a autorização; o QR do 1º pagamento ativa o débito
    // recorrente. Ver lib/asaas (confirmar immediateQrCode/resposta no sandbox).
    if (modo === "pix_automatico") {
      const auth = await criarAutorizacaoPixAutomatico({
        clienteId,
        userId: usuario.id,
        valorReais,
        descricao: "Repasse Livre PRO",
      });
      const url = auth.invoiceUrl;
      if (url) return NextResponse.json({ url });
      // Sem página hospedada → devolve o QR copia-e-cola (front renderiza se preciso).
      if (auth.payload) return NextResponse.json({ qrPayload: auth.payload });
      return NextResponse.json({ erro: "sem_fatura_pixauto" }, { status: 502 });
    }

    // Modo ASSINATURA (Pix QR manual/mês — Asaas cria as cobranças). Valida o
    // pipeline agora; vira Pix Automático trocando ASAAS_MODO.
    const hojeISO = new Date().toISOString().slice(0, 10);
    const subId = await criarAssinatura({
      clienteId,
      userId: usuario.id,
      valorReais,
      descricao: "Repasse Livre PRO — assinatura mensal",
      billingType: cpfCnpj ? "PIX" : "UNDEFINED",
      proximoVencimento: hojeISO,
    });

    const url = await primeiraCobranca(subId);
    if (!url) return NextResponse.json({ erro: "sem_fatura" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.error("[assinatura/asaas] falha:", erro);
    // Debug: grava o erro real (resposta crua do Asaas) pra diagnóstico sem log da Vercel.
    try {
      await supabaseAdmin.from("worker_config").upsert(
        { chave: "ASAAS_DEBUG_CHECKOUT", valor: JSON.stringify({ em: new Date().toISOString(), modo, valorReais, detalhe }).slice(0, 60000) },
        { onConflict: "chave" }
      );
    } catch {
      /* debug não pode derrubar */
    }
    return NextResponse.json({ erro: "falha_checkout", detalhe }, { status: 500 });
  }
}
