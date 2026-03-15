// ============================================
// FINANCO - API: Admin — Gerenciar usuários
// Apenas salomdesenvolvimentos@hotmail.com
// ============================================

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'salomdesenvolvimentos@hotmail.com';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function verifyAdmin(req: NextRequest): Promise<{ ok: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { ok: false, error: 'Token ausente' };

  // Verificar token com Supabase Auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { ok: false, error: 'Token inválido' };
  if (data.user.email !== ADMIN_EMAIL) return { ok: false, error: 'Não autorizado' };

  return { ok: true };
}

// GET /api/admin/users — listar todos os usuários
export async function GET(req: NextRequest) {
  const { ok, error } = await verifyAdmin(req);
  if (!ok) return NextResponse.json({ error }, { status: 403 });

  const supabase = getServiceClient();

  // Buscar todos os usuários do auth (inclui admin mesmo sem row em public.users)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  // Buscar dados de plano de public.users
  const { data: planRows } = await supabase
    .from('users')
    .select('id, name, plan');

  const planMap = new Map((planRows ?? []).map((u: any) => [u.id, u]));

  const users = authData.users.map((u) => {
    const pub = planMap.get(u.id) as any;
    return {
      id: u.id,
      email: u.email ?? '',
      name: pub?.name ?? (u.user_metadata?.name as string) ?? null,
      plan: (pub?.plan ?? 'free') as 'free' | 'premium',
      created_at: u.created_at,
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ users });
}

// PATCH /api/admin/users — alterar plano de um usuário
export async function PATCH(req: NextRequest) {
  const { ok, error } = await verifyAdmin(req);
  if (!ok) return NextResponse.json({ error }, { status: 403 });

  let body: { userId: string; plan: 'free' | 'premium' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { userId, plan } = body;
  if (!userId || !['free', 'premium'].includes(plan)) {
    return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { error: dbError } = await supabase
    .from('users')
    .update({ plan })
    .eq('id', userId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
