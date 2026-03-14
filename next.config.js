/** @type {import('next').NextConfig} */

// Quando CAPACITOR_BUILD=true, gera export estático para o Capacitor Android.
// Para web (Vercel), o build normal com API routes continua funcionando.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig = {
  ...(isCapacitorBuild
    ? {
        output: 'export',
        trailingSlash: true,
        // API routes são excluídas automaticamente do export estático.
        // O app Android chama a URL de produção definida em NEXT_PUBLIC_API_BASE_URL.
      }
    : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
    ...(isCapacitorBuild ? { unoptimized: true } : {}),
  },
};

module.exports = nextConfig;
