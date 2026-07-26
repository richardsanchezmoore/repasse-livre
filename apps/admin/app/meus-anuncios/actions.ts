"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { obterUsuarioAtual } from "@/lib/supabase-server";

/**
 * Exclui um anúncio DO PRÓPRIO usuário (só quando criado_por bate — ninguém apaga
 * anúncio alheio). Soft-delete via status="excluido": some do /meus-anuncios e do
 * board (que só mostra "aprovada"), mas mantém a linha (o usuário PAGOU por ele —
 * bom pra registro) e evita quebrar FKs (favoritos etc.). Ver
 * project_repasse_livre_low_ticket_vender_anuncio.
 */
export async function excluirAnuncioProprio(anuncioId: string): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) return { ok: false, erro: "Você precisa estar logado." };

  const { error } = await supabaseAdmin
    .from("opportunities")
    .update({ status: "excluido" })
    .eq("id", anuncioId)
    .eq("criado_por", usuario.id); // trava: só o dono

  if (error) return { ok: false, erro: "Não foi possível excluir agora. Tente de novo." };

  revalidatePath("/meus-anuncios");
  revalidatePath("/");
  return { ok: true };
}
