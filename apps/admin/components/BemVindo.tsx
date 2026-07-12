"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ArrowRight, Compass } from "lucide-react";

const CHAVE = "rl_destino_pos_compra";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Boas-vindas pós-compra (destino do "acessar produto" da Cakto). Destino
 * inteligente conforme a chegada (anúncio fechado → volta pro carro; campanha →
 * home). Se o comprador NÃO estava logado (checkout sem conta), pede 1 login com
 * o email da compra — a conta já foi criada + premium liberado pelo webhook.
 */
export function BemVindo({ logado }: { logado: boolean }) {
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(CHAVE);
    if (d && UUID.test(d)) setDestinoId(d);
    if (d) localStorage.removeItem(CHAVE);
    setPronto(true);
  }, []);

  const destino = destinoId ? `/oportunidade/${destinoId}` : "/";

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
          (logado ? (
            destinoId ? (
              <>
                <Link href={destino} className="bemvindo-cta">
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
            )
          ) : (
            <>
              <p className="bemvindo-nota">
                Falta 1 passo: <strong>entre com o mesmo email que você usou na compra</strong> pra acessar.
              </p>
              <Link href={`/login?redirect=${encodeURIComponent(destino)}`} className="bemvindo-cta">
                <ArrowRight size={18} strokeWidth={2.2} /> Entrar e acessar
              </Link>
            </>
          ))}
      </div>
    </div>
  );
}
