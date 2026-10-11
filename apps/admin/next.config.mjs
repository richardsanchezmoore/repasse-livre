/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "img.olx.com.br" }],
  },

  async redirects() {
    return [
      /**
       * ★★ /carros/... → /autos/... (Gustavo, 11/10/2026).
       *
       * A palavra do segmento passou a ser a da praça. Num site em espanhol,
       * "carros" na URL entrega que o site foi traduzido e não escrito ali —
       * e a URL é a primeira coisa que aparece no resultado de busca.
       *
       * ⚠️ PERMANENTE (308) e não temporário: é troca definitiva de endereço,
       * e é o 308 que transfere a autoridade do link antigo para o novo. Um
       * 307 pediria ao Google para continuar tratando /carros como o canônico.
       *
       * ⚠️ O redirect FICA mesmo sem nada indexado hoje: o site está trancado
       * e o domínio acabou de mudar, mas link de WhatsApp, print e favorito de
       * navegador não expiram — e um 404 neles custa mais que esta regra.
       */
      { source: "/carros/:caminho*", destination: "/autos/:caminho*", permanent: true },
      { source: "/pt/carros/:caminho*", destination: "/pt/autos/:caminho*", permanent: true },
    ];
  },
};

export default nextConfig;
