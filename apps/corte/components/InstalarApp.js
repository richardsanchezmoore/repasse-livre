"use client";
import { useEffect, useState } from "react";

export default function InstalarApp({ titulo = "📲 Leve Damas Virtuosas no bolso" }) {
  const [prompt, setPrompt] = useState(null);
  const [instalado, setInstalado] = useState(false);
  const [os, setOs] = useState("outro"); // ios | android | outro
  const [guia, setGuia] = useState(false); // abre o mini-guia (iOS / manual)

  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;
    if (standalone) { setInstalado(true); return; }
    const ua = window.navigator.userAgent || "";
    if (/iphone|ipad|ipod/i.test(ua) && !window.MSStream) setOs("ios");
    else if (/android/i.test(ua)) setOs("android");
    else setOs("outro");
    const h = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", () => setInstalado(true));
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (instalado) return null;

  async function acionar() {
    if (prompt) {
      // Android / Chrome / Edge — dispara o diálogo nativo de instalação (1 toque)
      prompt.prompt();
      try { await prompt.userChoice; } catch {}
      setPrompt(null);
      return;
    }
    // iOS (sem API) ou desktop sem prompt — abre o mini-guia visual
    setGuia(true);
  }

  const sub = prompt
    ? "Um toque — vira app com ícone próprio, sem loja."
    : os === "ios"
    ? "Toque para ver como colocar na tela inicial."
    : "Toque para ver como instalar.";

  return (
    <section className="card inst">
      <button type="button" className="inst-cta" onClick={acionar}>
        <span className="inst-ic">📲</span>
        <span className="inst-tx">
          <span className="inst-t">{titulo.replace(/^📲\s*/, "")}</span>
          <span className="inst-d">{sub}</span>
        </span>
        <span className="inst-go">→</span>
      </button>

      {guia && (
        <div className="inst-sheet" role="dialog" aria-modal="true" onClick={() => setGuia(false)}>
          <div className="inst-sheet-card" onClick={(e) => e.stopPropagation()}>
            {os === "ios" ? (
              <>
                <div className="inst-sheet-h">Adicionar à tela inicial</div>
                <ol className="inst-steps">
                  <li><span className="inst-num">1</span> Toque em <strong>Compartilhar</strong> <span className="inst-share"></span> na barra do Safari.</li>
                  <li><span className="inst-num">2</span> Role e toque em <strong>“Adicionar à Tela de Início”</strong>.</li>
                  <li><span className="inst-num">3</span> Confirme em <strong>Adicionar</strong>. Pronto! 👑</li>
                </ol>
              </>
            ) : (
              <>
                <div className="inst-sheet-h">Instalar Damas Virtuosas</div>
                <ol className="inst-steps">
                  <li><span className="inst-num">1</span> Abra o menu <strong>{os === "android" ? "⋮" : "⋮ / barra de endereço"}</strong> do navegador.</li>
                  <li><span className="inst-num">2</span> Toque em <strong>“Instalar app”</strong> (ou “Adicionar à tela inicial”).</li>
                  <li><span className="inst-num">3</span> Confirme. Pronto! 👑</li>
                </ol>
              </>
            )}
            <button type="button" className="inst-fechar" onClick={() => setGuia(false)}>Entendi</button>
          </div>
        </div>
      )}
    </section>
  );
}
