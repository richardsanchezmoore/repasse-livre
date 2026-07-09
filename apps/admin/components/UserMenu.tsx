"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarSupabaseBrowser } from "@/lib/supabase-browser";
import type { Usuario } from "@/lib/supabase-server";
import { IconDropdown } from "./IconDropdown";
import { IconeGoogle } from "./IconeGoogle";
import { UserRound } from "lucide-react";

export function UserMenu({ usuario }: { usuario: Usuario | null }) {
  const router = useRouter();

  async function aoEntrarComGoogle() {
    const supabase = criarSupabaseBrowser();
    // Volta pra página atual depois de logar (não força a home).
    const destino = window.location.pathname + window.location.search;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(destino)}` },
    });
  }

  if (!usuario) {
    return (
      <IconDropdown Icone={UserRound} rotulo="Entrar ou criar conta">
        <button type="button" className="top-bar-google" onClick={aoEntrarComGoogle}>
          <IconeGoogle size={18} />
          Continuar com Google
        </button>
        <Link href="/login" className="top-bar-login">
          Login
        </Link>
        <Link href="/cadastro" className="top-bar-cadastro">
          Criar Conta
        </Link>
      </IconDropdown>
    );
  }

  async function aoSair() {
    const supabase = criarSupabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
  }

  const inicial = (usuario.nome ?? usuario.email ?? "?").charAt(0).toUpperCase();
  // Conta criada via login simples (e-mail/senha ou Google) nunca pediu
  // WhatsApp — só aparece depois do primeiro anúncio ou aqui.
  const dadosIncompletos = !usuario.nome || !usuario.whatsapp;

  return (
    <div className="usuario-icone-wrapper">
      <IconDropdown
        Icone={UserRound}
        rotulo={usuario.nome ?? usuario.email ?? "Usuário"}
        avatarUrl={usuario.avatarUrl}
      >
        <div className="usuario-menu-botao">
          <span className="usuario-menu-avatar">
            {usuario.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={usuario.avatarUrl}
                alt=""
                className="usuario-menu-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              inicial
            )}
          </span>
          <span className="usuario-menu-email">{usuario.nome ?? usuario.email}</span>
        </div>
        {dadosIncompletos && (
          <Link href="/completar-dados" className="usuario-menu-completar-dados">
            Completar Dados
          </Link>
        )}
        <button type="button" className="usuario-menu-sair" onClick={aoSair}>
          Sair
        </button>
      </IconDropdown>
      <span className="usuario-status-online" title="Logado" />
    </div>
  );
}
