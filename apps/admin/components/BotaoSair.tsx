"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";

/** Sair da conta (usado na página /conta). Encerra a sessão e recarrega. */
export function BotaoSair() {
  const router = useRouter();

  async function sair() {
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <button type="button" className="conta-sair" onClick={sair}>
      <LogOut size={16} strokeWidth={2} /> Sair da conta
    </button>
  );
}
