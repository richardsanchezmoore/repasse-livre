"use client";
import { useEffect } from "react";
import { marcarAvisosLidos } from "@/app/sala/actions";

/** Marca os avisos como lidos ao abrir a tela (limpa o badge). */
export default function MarcarLidos() {
  useEffect(() => { marcarAvisosLidos().catch(() => {}); }, []);
  return null;
}
