import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

/**
 * Extracts and validates the Bearer token from the request Authorization header.
 * Returns the authenticated user ID, or null if the token is absent or invalid.
 *
 * Usage in API routes:
 *   const userId = await verifyAuth(req);
 *   if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
 */
export async function verifyAuth(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}
