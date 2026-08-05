/** @type {import('next').NextConfig} */
// O app roda sob /lar (damasvirtuosas.com/lar). Em produção, o app do corte
// (damasvirtuosas.com) faz rewrite de /lar/* pra este deploy (Next Multi Zones) —
// um domínio, dois apps isolados: um bug aqui nunca derruba a campanha do corte.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/lar";

const nextConfig = {
  reactStrictMode: true,
  basePath,
};

export default nextConfig;
