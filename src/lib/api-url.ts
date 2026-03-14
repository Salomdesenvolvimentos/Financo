/**
 * Returns the base URL prefix for API routes.
 *
 * - Web (Vercel / servidor): NEXT_PUBLIC_API_BASE_URL é vazio → paths relativos (/api/...) funcionam normalmente.
 * - Mobile (Capacitor): o app roda como arquivo local (file://), então as
 *   chamadas à API precisam da URL absoluta do servidor de produção.
 *   Defina NEXT_PUBLIC_API_BASE_URL=https://seu-app.vercel.app no .env.mobile antes de buildar.
 *
 * Uso:
 *   const res = await fetch(apiUrl('/api/ai'), { ... });
 */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base}${path}`;
}
