import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarEmailResend, renderAlerta, type AnuncioEmail } from "./email";

/**
 * ENTREGA dos alertas por e-mail. O matching (matching.ts) só registra os pares
 * pendentes (busca, anúncio) em `alertas_enviados` com enviado_em NULL. Aqui é onde
 * o e-mail de fato sai e o enviado_em é carimbado.
 *
 * Dois modos, mesma mecânica de agrupar-por-usuário-e-mandar:
 *  - na_hora  → dispara logo após a aprovação, só pros pares desta rodada.
 *  - diario   → um cron chama enviarResumoDiario() e drena TODA a fila 'diario'.
 *
 * Tudo best-effort: falha de e-mail é logada e nunca deixa o par como enviado (fica
 * na fila pra próxima). Um par só vira enviado_em quando o Resend confirma o envio.
 */

const CAMPOS_ANUNCIO =
  "id, veiculo, versao, ano, cidade, estado, origem_tipo, preco, fipe_valor, margem_percentual, foto_principal";

interface DestinatarioPro {
  email: string;
  nome: string | null;
}

/** E-mail + nome do dono, SOMENTE se ele ainda é PRO (não vaza alerta pra quem virou free). */
async function destinatarioSeAindaPro(userId: string): Promise<DestinatarioPro | null> {
  const { data: perfil } = await supabaseAdmin
    .from("perfis")
    .select("nome, premium, assinatura_status, premium_expira_em")
    .eq("user_id", userId)
    .single();
  if (!perfil) return null;

  const statusAtivo = perfil.assinatura_status === "active" || perfil.assinatura_status === "trialing";
  const dentroValidade = perfil.premium_expira_em
    ? new Date(perfil.premium_expira_em).getTime() > Date.now()
    : false;
  const ehPro = perfil.premium === true || (statusAtivo && dentroValidade);
  if (!ehPro) return null;

  // O e-mail vive em auth.users, não em perfis.
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (!email) return null;
  return { email, nome: perfil.nome ?? null };
}

/** Um par pendente carregado da fila, com a busca a que pertence. */
interface ParPendente {
  id: string; // alertas_enviados.id
  opportunity_id: string;
  user_id: string;
}

/**
 * Núcleo compartilhado: dado um conjunto de pares pendentes (já filtrados por
 * frequência), agrupa por usuário, envia um e-mail por usuário com os anúncios
 * casados e carimba enviado_em nos pares efetivamente entregues. Retorna quantos
 * e-mails saíram.
 */
async function entregar(pares: ParPendente[], frequencia: "na_hora" | "diario"): Promise<number> {
  if (pares.length === 0) return 0;

  // Anúncios envolvidos (uma leitura só).
  const oppIds = [...new Set(pares.map((p) => p.opportunity_id))];
  const { data: anuncios } = await supabaseAdmin
    .from("opportunities")
    .select(CAMPOS_ANUNCIO)
    .in("id", oppIds)
    .eq("status", "aprovada"); // se saiu do ar entre o match e o envio, não alerta
  const porId = new Map<string, AnuncioEmail>();
  for (const a of (anuncios ?? []) as AnuncioEmail[]) porId.set(a.id, a);

  // Agrupa pares por usuário.
  const porUsuario = new Map<string, ParPendente[]>();
  for (const p of pares) {
    const lista = porUsuario.get(p.user_id) ?? [];
    lista.push(p);
    porUsuario.set(p.user_id, lista);
  }

  let enviados = 0;
  for (const [userId, paresDoUsuario] of porUsuario) {
    // Anúncios distintos deste usuário que ainda estão aprovados.
    const anunciosUsuario: AnuncioEmail[] = [];
    const vistos = new Set<string>();
    for (const p of paresDoUsuario) {
      const a = porId.get(p.opportunity_id);
      if (a && !vistos.has(a.id)) {
        vistos.add(a.id);
        anunciosUsuario.push(a);
      }
    }
    if (anunciosUsuario.length === 0) continue;

    const dest = await destinatarioSeAindaPro(userId);
    if (!dest) {
      // Não é mais PRO (ou sem e-mail): tira da fila sem enviar, pra não reprocessar sempre.
      await marcarEnviados(paresDoUsuario.map((p) => p.id));
      continue;
    }

    const { assunto, html } = renderAlerta(dest.nome, anunciosUsuario, frequencia);
    const r = await enviarEmailResend(dest.email, assunto, html);
    if (!r.ok) {
      console.error(`[alertas] e-mail falhou (${frequencia}) user=${userId}:`, r.erro);
      continue; // deixa pendente pra próxima rodada
    }
    // Só carimba os pares cujo anúncio realmente entrou no e-mail.
    const idsEntregues = paresDoUsuario.filter((p) => vistos.has(p.opportunity_id)).map((p) => p.id);
    await marcarEnviados(idsEntregues);
    enviados++;
  }
  return enviados;
}

async function marcarEnviados(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabaseAdmin
    .from("alertas_enviados")
    .update({ enviado_em: new Date().toISOString() })
    .in("id", ids);
  if (error) console.error("[alertas] falha ao carimbar enviado_em:", error.message);
}

/**
 * Envio IMEDIATO: chamado logo após registrar os pares desta aprovação. Pega os
 * pares pendentes destes anúncios cujas buscas são 'na_hora' e entrega na hora.
 */
export async function enviarAlertasNaHora(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  try {
    const { data: pend } = await supabaseAdmin
      .from("alertas_enviados")
      .select("id, opportunity_id, busca_id, buscas_salvas!inner(user_id, frequencia, ativo)")
      .is("enviado_em", null)
      .in("opportunity_id", ids)
      .eq("buscas_salvas.frequencia", "na_hora")
      .eq("buscas_salvas.ativo", true);
    if (!pend || pend.length === 0) return 0;

    const pares: ParPendente[] = pend.map((r) => {
      // A join vem como objeto (inner, 1:1); alguns clients tipam como array.
      const busca = Array.isArray(r.buscas_salvas) ? r.buscas_salvas[0] : r.buscas_salvas;
      return { id: r.id as string, opportunity_id: r.opportunity_id as string, user_id: busca.user_id as string };
    });
    return await entregar(pares, "na_hora");
  } catch (e) {
    console.error("[alertas] envio na_hora falhou (ignorado):", e instanceof Error ? e.message : e);
    return 0;
  }
}

/**
 * Resumo DIÁRIO: drena TODA a fila pendente das buscas 'diario' (um e-mail por
 * usuário com tudo que casou desde o último resumo). Chamado por um cron 1×/dia.
 */
export async function enviarResumoDiario(): Promise<number> {
  try {
    const { data: pend } = await supabaseAdmin
      .from("alertas_enviados")
      .select("id, opportunity_id, busca_id, buscas_salvas!inner(user_id, frequencia, ativo)")
      .is("enviado_em", null)
      .eq("buscas_salvas.frequencia", "diario")
      .eq("buscas_salvas.ativo", true);
    if (!pend || pend.length === 0) return 0;

    const pares: ParPendente[] = pend.map((r) => {
      const busca = Array.isArray(r.buscas_salvas) ? r.buscas_salvas[0] : r.buscas_salvas;
      return { id: r.id as string, opportunity_id: r.opportunity_id as string, user_id: busca.user_id as string };
    });
    return await entregar(pares, "diario");
  } catch (e) {
    console.error("[alertas] resumo diário falhou (ignorado):", e instanceof Error ? e.message : e);
    return 0;
  }
}
