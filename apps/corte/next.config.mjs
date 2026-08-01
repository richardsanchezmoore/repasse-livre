/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Landing de vendas (HTML estático em /public/panfleto) com URL limpa /panfleto.
      { source: "/panfleto", destination: "/panfleto/index.html" },
    ];
  },
};

export default nextConfig;
