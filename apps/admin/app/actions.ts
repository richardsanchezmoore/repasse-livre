"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import type { StatusOportunidade } from "@/lib/types";

async function atualizarStatus(id: string, status: StatusOportunidade): Promise<void> {
  const { error } = await supabaseAdmin.from("opportunities").update({ status }).eq("id", id);
  if (error) {
    throw new Error(`Falha ao atualizar status: ${error.message}`);
  }
  revalidatePath("/");
}

export async function aprovarOportunidade(id: string): Promise<void> {
  await atualizarStatus(id, "aprovada");
}

export async function rejeitarOportunidade(id: string): Promise<void> {
  await atualizarStatus(id, "rejeitada");
}

export async function alternarFavorito(id: string, favoritoAtual: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("opportunities")
    .update({ favorito: !favoritoAtual })
    .eq("id", id);
  if (error) {
    throw new Error(`Falha ao favoritar: ${error.message}`);
  }
  revalidatePath("/");
}
