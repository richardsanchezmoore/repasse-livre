import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";

export const metadata = {
  title: "A Corte · Pela Fé",
  description: "O seu refúgio de discernimento, fé e comunidade — na Temporada de Pretendentes.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#fbf6ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="A Corte" />
      </head>
      <body>
        <div className="app">
          <TopBar />
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
