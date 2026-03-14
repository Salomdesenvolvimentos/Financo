import { verifyAuth as _verifyAuth } from '@/lib/server-auth';
import type { NextRequest } from 'next/server';

export { _verifyAuth as verifyAuth };

/** Cached Pluggy API key with expiry (Pluggy keys are valid for ~2 h). */
let cachedApiKey: { key: string; expiresAt: number } | null = null;

export async function getPluggyApiKey(): Promise<string> {
  if (cachedApiKey && Date.now() < cachedApiKey.expiresAt) {
    return cachedApiKey.key;
  }

  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error('Falha na autenticação Pluggy');
  const data = await res.json();

  cachedApiKey = {
    key: data.apiKey as string,
    expiresAt: Date.now() + 90 * 60 * 1000, // 90 min TTL (safe margin)
  };
  return cachedApiKey.key;
}

export function pluggyConfigured(): boolean {
  return !!(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

/** Shared 401 guard for Pluggy routes. Returns userId or null. */
export async function requireAuth(req: NextRequest): Promise<string | null> {
  return _verifyAuth(req);
}
