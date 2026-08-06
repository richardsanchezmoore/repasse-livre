import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PWA from "@/components/PWA";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata = {
  title: "Marta — a sua ajudante do lar",
  description: "A assistente que organiza a sua casa, as refeições e a rotina da família — com carinho e sabedoria.",
  applicationName: "Marta",
  // O basePath não é aplicado sozinho nesses <link> — apontamos explícito p/ o /lar.
  manifest: BASE + "/manifest.webmanifest",
  icons: {
    icon: [{ url: BASE + "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: BASE + "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Abre em tela cheia (sem barra do navegador) quando adicionada à tela inicial no iPhone.
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Marta" },
};

export const viewport = { themeColor: "#bd5f42", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="app">
          <header className="top">
            <div className="mark">M</div>
            <div className="wm">Marta <span>· Lar &amp; Família</span></div>
          </header>
          {children}
          <BottomNav />
        </div>
        <PWA />
      </body>
    </html>
  );
}
