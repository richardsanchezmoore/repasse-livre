"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NOME = "rl_geo";
const COOKIE_NEGADO = "rl_geo_negado";
const COOKIE_MAX_IDADE_SEGUNDOS = 60 * 60 * 24 * 30;

function lerCookie(nome: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nome}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function definirCookie(nome: string, valor: string): void {
  document.cookie = `${nome}=${encodeURIComponent(valor)}; path=/; max-age=${COOKIE_MAX_IDADE_SEGUNDOS}`;
}

/**
 * Pede a geolocalização precisa do navegador (silenciosamente — sem UI
 * própria, é o próprio pop-up nativo do navegador) pra refinar o "ordenar
 * por proximidade" além do fallback por IP (ver lib/geolocalizacao.ts).
 * Grava um cookie tanto se a pessoa permite (`rl_geo`, com as coordenadas)
 * quanto se nega/falha (`rl_geo_negado`) — sem o segundo cookie, quem nega
 * via popup do navegador (que não fica "lembrado" pelo nosso lado) seria
 * perguntado de novo em toda visita à home, em vez de só uma vez.
 */
export function DetectorLocalizacao() {
  const router = useRouter();

  useEffect(() => {
    if (lerCookie(COOKIE_NOME) || lerCookie(COOKIE_NEGADO) || !("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const valor = `${posicao.coords.latitude},${posicao.coords.longitude}`;
        definirCookie(COOKIE_NOME, valor);
        router.refresh();
      },
      () => {
        // Negou ou falhou — não pergunta de novo; servidor já usa o
        // fallback de IP desde o primeiro render (lib/geolocalizacao.ts).
        definirCookie(COOKIE_NEGADO, "1");
      },
      { maximumAge: COOKIE_MAX_IDADE_SEGUNDOS * 1000, timeout: 8000 }
    );
  }, [router]);

  return null;
}
