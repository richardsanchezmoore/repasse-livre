"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ArrowRight, Compass } from "lucide-react";

const CHAVE = "rl_destino_pos_compra";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Boas-vindas pós-compra (destino do "acessar produto" da Cakto). Destino
 * inteligente conforme a chegada: se o usuário tinha batido num anúncio fechado
 * (id guardado em localStorage por CapturaDestino), volta pra ESSE anúncio; senão
 * (veio de campanha) vai pra home. Lê e limpa o localStorage.
 */
export function BemVindo() {
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(CHAVE);
    if (d && UUID.test(d)) setDestinoId(d);
    if (d) localStorage.removeItem(CHAVE);
    setPronto(true);
  }, []);

  return (
    <div className="bemvindo">
      <div className="bemvindo-card">
        <span className="bemvindo-check">
          <BadgeCheck size={40} strokeWidth={2} />
        </span>
        <h1 className="bemvindo-titulo">Bem-vindo ao Repasse Livre PRO! 🎉</h1>
        <p className="bemvindo-sub">
          Pagamento aprovado — seu acesso já está <strong>liberado</strong>. Agora você enxerga o mercado como
          ninguém: todas as ofertas abaixo da FIPE, o Copiloto e a inteligência da BIA na sua mão.
        </p>

        {pronto &&
          (destinoId ? (
            <>
              <Link href={`/oportunidade/${destinoId}`} className="bemvindo-cta">
                <ArrowRight size={18} strokeWidth={2.2} /> Voltar pro carro que você queria
              </Link>
              <Link href="/" className="bemvindo-secundario">
                Explorar todas as oportunidades
              </Link>
            </>
          ) : (
            <Link href="/" className="bemvindo-cta">
              <Compass size={18} strokeWidth={2.2} /> Explorar as oportunidades
            </Link>
          ))}
      </div>
    </div>
  );
}
