/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Landings de vendas (HTML estático) com URL limpa.
      { source: "/panfleto", destination: "/panfleto/index.html" },          // foco APP
      { source: "/panfleto-slim", destination: "/panfleto-slim/index.html" }, // foco LIVRO (teste A/B)
    ];
  },
};

export default nextConfig;
