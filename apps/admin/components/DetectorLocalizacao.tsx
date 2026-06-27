"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NOME = "rl_geo";
const COOKIE_MAX_IDADE_SEGUNDOS = 60 * 60 * 24 * 30;

function lerCookie(nome: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Pede a geolocalização precisa do navegador (silenciosamente — sem UI
 * própria, é o próprio pop-up nativo do navegador) pra refinar o "ordenar
 * por proximidade" além do fallback por IP (ver lib/geolocalizacao.ts). Só
 * pergunta uma vez por cookie ainda válido; se o usuário negar, o servidor
 * já está usando o IP como fallback desde o primeiro render — não há
 * segundo pop-up nem mensagem de erro visível.
 */
export function DetectorLocalizacao() {
  const router = useRouter();

  useEffect(() => {
    if (lerCookie(COOKIE_NOME) || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const valor = `${posicao.coords.latitude},${posicao.coords.longitude}`;
        document.cookie = `${COOKIE_NOME}=${encodeURIComponent(valor)}; path=/; max-age=${COOKIE_MAX_IDADE_SEGUNDOS}`;
        router.refresh();
      },
      () => {
        // Negou ou falhou — segue com o fallback de IP já usado no render atual.
      },
      { maximumAge: COOKIE_MAX_IDADE_SEGUNDOS * 1000, timeout: 8000 }
    );
  }, [router]);

  return null;
}
