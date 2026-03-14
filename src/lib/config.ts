/**
 * Returns true when running against a local Supabase instance (dev/demo mode).
 *
 * IMPORTANT: This flag is a client-side UI convenience ONLY.
 * Never use it for server-side authorization decisions.
 */
export const isLocalMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321') ?? false;
};
