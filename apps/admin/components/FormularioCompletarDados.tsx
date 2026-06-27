"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { salvarDadosCompletos, type ResultadoCompletarDados } from "@/app/completar-dados/actions";
import { apenasDigitos, formatarWhatsapp } from "@/lib/mascaras";

const ESTADO_INICIAL: ResultadoCompletarDados = { erro: null, sucesso: false };

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="formulario-enviar" disabled={pending}>
      {pending ? (
        <>
          <Loader2 size={18} strokeWidth={2} className="formulario-enviar-spinner" />
          Salvando…
        </>
      ) : (
        "Salvar dados"
      )}
    </button>
  );
}

export function FormularioCompletarDados({
  nomeInicial,
  whatsappInicial,
}: {
  nomeInicial: string | null;
  whatsappInicial: string | null;
}) {
  const [estado, acao] = useFormState(salvarDadosCompletos, ESTADO_INICIAL);
  const [nome, setNome] = useState(nomeInicial ?? "");
  const [whatsappDigitos, setWhatsappDigitos] = useState(whatsappInicial ?? "");

  if (estado.sucesso) {
    return <p className="formulario-sucesso">Dados salvos! Já usamos isso da próxima vez que você anunciar.</p>;
  }

  return (
    <form action={acao} className="formulario-envio">
      {estado.erro && <p className="formulario-erro">{estado.erro}</p>}

      <label className="campo">
        <input name="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
      </label>

      <label className="campo">
        <input
          inputMode="numeric"
          value={formatarWhatsapp(whatsappDigitos)}
          onChange={(e) => setWhatsappDigitos(apenasDigitos(e.target.value))}
          placeholder="Whats: (51) 99999-9999"
        />
      </label>
      <input type="hidden" name="whatsapp" value={whatsappDigitos} />

      <BotaoSalvar />
    </form>
  );
}
