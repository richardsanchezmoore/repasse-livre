"use client";
import { useEffect, useState } from "react";

export default function InstalarApp({ titulo = "📲 Leve A Corte no bolso" }) {
  const [prompt, setPrompt] = useState(null);
  const [instalado, setInstalado] = useState(false);
  const [os, setOs] = useState("outro"); // ios | android | outro

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

  async function instalar() {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <section className="card inst">
      <div className="c-k">{titulo}</div>

      {prompt ? (
        // Android / desktop Chrome — instalação em 1 toque
        <button type="button" className="inst-opt inst-btn" onClick={instalar}>
          <span className="inst-ic">{os === "ios" ? "" : os === "android" ? "🤖" : "⬇️"}</span>
          <div>
            <div className="inst-t">Adicionar à tela inicial</div>
            <div className="inst-d">Um toque — vira app com ícone próprio, sem loja.</div>
          </div>
          <span className="inst-go">→</span>
        </button>
      ) : os === "ios" ? (
        <div className="inst-opt">
          <span className="inst-ic"></span>
          <div>
            <div className="inst-t">No seu iPhone</div>
            <div className="inst-d">Toque em <strong>Compartilhar</strong> (o quadrado com a seta ↑) na barra do Safari e escolha <strong>“Adicionar à Tela de Início”</strong>.</div>
          </div>
        </div>
      ) : os === "android" ? (
        <div className="inst-opt">
          <span className="inst-ic">🤖</span>
          <div>
            <div className="inst-t">No seu Android</div>
            <div className="inst-d">Abra o menu <strong>⋮</strong> do Chrome e toque em <strong>“Instalar app”</strong> (ou “Adicionar à tela inicial”).</div>
          </div>
        </div>
      ) : (
        <div className="inst-opt">
          <span className="inst-ic">💻</span>
          <div>
            <div className="inst-t">No navegador</div>
            <div className="inst-d">Toque no ícone de <strong>instalar</strong> na barra de endereço, ou menu → <strong>Instalar A Corte</strong>.</div>
          </div>
        </div>
      )}
    </section>
  );
}
