import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata = {
  title: "Marta — a sua ajudante do lar",
  description: "A assistente que organiza a sua casa, as refeições e a rotina da família — com carinho e sabedoria.",
};

export const viewport = { themeColor: "#bd5f42", width: "device-width", initialScale: 1 };

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
      </body>
    </html>
  );
}
