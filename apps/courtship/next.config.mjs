/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Sales landing (static HTML) with a clean URL.
      { source: "/almanac", destination: "/almanac/index.html" },
    ];
  },
};

export default nextConfig;
