"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTextos } from "@/lib/useIdioma";
import { SeletorIdioma } from "@/components/SeletorIdioma";

/**
 * A MOLDURA DAS TELAS DE CONTA — entrar, criar conta, redefinir senha.
 *
 * ★ Existe para as três não repetirem logo, título, subtítulo, rodapé legal e
 * seletor de idioma — e, principalmente, para o texto delas sair do dicionário
 * em vez de ficar chumbado em três arquivos.
 *
 * ⚠️ O SELETOR DE IDIOMA FICA AQUI porque estas páginas NÃO têm a TopBar. Sem
 * ele, quem cai direto no login de um link externo não tem como trocar — e foi
 * justamente aqui que o Gustavo viu o site falando português (11/10/2026).
 */
export function CascaAuth({
  titulo,
  subtitulo,
  children,
  rodape,
  legal = true,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  /** ⚠️ A tela de criar conta traz o próprio aviso legal (mais completo),
   *  então o genérico sairia duplicado — é o que aparecia no ensaio. */
  legal?: boolean;
}) {
  const tx = useTextos();
  return (
    <div className="login-pagina">
      <div className="login-card">
        <div className="login-topo-idioma">
          <SeletorIdioma />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="AutoRadarPy" className="login-logo" />
        <h1 className="visualmente-oculto">{titulo}</h1>
        <p className="login-subtitulo">{subtitulo}</p>
        {children}
        {rodape && <p className="login-rodape">{rodape}</p>}
        {legal && (
          <p className="login-legal">
            <Link href="/privacidade">{tx("privacidade")}</Link> · <Link href="/termos">{tx("termosDeUso")}</Link>
          </p>
        )}
      </div>
    </div>
  );
}

/** "Não tem conta? Criar conta" — texto do dicionário, link de fora. */
export function RodapeTrocaConta({ pergunta, href, acao }: { pergunta: string; href: string; acao: string }) {
  return (
    <>
      {pergunta} <Link href={href}>{acao}</Link>
    </>
  );
}
