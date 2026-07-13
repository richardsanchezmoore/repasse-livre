import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { acharOuCriarCliente, criarAssinatura, primeiraCobranca } from "@/lib/asaas";
import { buscarPrecoExibicao } from "@/lib/assinatura";

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

  try {
    const clienteId = await acharOuCriarCliente({
      userId: usuario.id,
      nome: (perfil?.nome as string) || usuario.email || "Assinante",
      email: usuario.email ?? "",
      cpfCnpj,
      telefone: (perfil?.whatsapp as string) || undefined,
    });

    // Cobra a partir de hoje (Brasília); ciclo mensal cuida das próximas.
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
    console.error("[assinatura/asaas] falha:", erro);
    return NextResponse.json({ erro: "falha_checkout", detalhe: erro instanceof Error ? erro.message : String(erro) }, { status: 500 });
  }
}
