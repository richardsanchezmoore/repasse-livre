import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import RegistrarSW from "@/components/RegistrarSW";

export const metadata = {
  title: "Damas Virtuosas · Pela Fé",
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
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Pinyon+Script&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Damas Virtuosas" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        {/* Meta Pixel (Damas Virtuosas · Damas do Altar) — PageView em todo o app */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');if(location.pathname.indexOf('/es')!==0){fbq('init','1013277894836851');fbq('track','PageView');}`,
          }}
        />
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt=""
            src="https://www.facebook.com/tr?id=1013277894836851&ev=PageView&noscript=1" />
        </noscript>
      </head>
      <body>
        <div className="app">
          <TopBar />
          {children}
        </div>
        <BottomNav />
        <RegistrarSW />
      </body>
    </html>
  );
}
