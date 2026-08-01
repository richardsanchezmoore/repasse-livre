"use client";
import { useEffect, useState } from "react";

export default function InstalarApp() {
  const [prompt, setPrompt] = useState(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;
    if (standalone) { setInstalado(true); return; }
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream);
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalado(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (instalado) return null;

  async function instalar() {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <section className="card" style={{ marginTop: 14 }}>
      <div className="c-k">📲 Instalar o app</div>
      {prompt ? (
        <>
          <div className="c-p">Tenha A Corte na tela inicial, com ícone próprio — como um app de verdade.</div>
          <button type="button" className="pill" onClick={instalar} style={{ marginTop: 12 }}>Adicionar à tela inicial →</button>
        </>
      ) : ios ? (
        <div className="c-p">No iPhone: toque em <strong>Compartilhar</strong> (o quadrado com a seta ↑) e escolha <strong>“Adicionar à Tela de Início”</strong>.</div>
      ) : (
        <div className="c-p">Abra o menu do navegador (⋮) e toque em <strong>“Instalar app”</strong> ou “Adicionar à tela inicial”.</div>
      )}
    </section>
  );
}
