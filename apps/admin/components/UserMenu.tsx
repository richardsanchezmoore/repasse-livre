"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";
import type { Usuario } from "@/lib/supabase-server";
import { IconDropdown } from "./IconDropdown";
import { UserRound } from "lucide-react";

export function UserMenu({ usuario }: { usuario: Usuario | null }) {
  const router = useRouter();

  if (!usuario) {
    return (
      <div className="top-bar-usuario">
        <Link href="/login" className="top-bar-login">
          Login
        </Link>
        <Link href="/cadastro" className="top-bar-cadastro">
          Criar Conta
        </Link>
      </div>
    );
  }

  async function aoSair() {
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
  }

  const inicial = (usuario.email ?? "?").charAt(0).toUpperCase();

  return (
    <IconDropdown Icone={UserRound} rotulo={usuario.email ?? "Usuário"}>
      <div className="usuario-menu-botao">
        <span className="usuario-menu-avatar">{inicial}</span>
        <span className="usuario-menu-email">{usuario.email}</span>
      </div>
      <button type="button" className="usuario-menu-sair" onClick={aoSair}>
        Sair
      </button>
    </IconDropdown>
  );
}
