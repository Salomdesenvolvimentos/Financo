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

/** Calcula premium_until a partir de dias (0 = permanente = null) */
function calcPremiumUntil(days: number | null | undefined): string | null {
  if (!days || days <= 0) return null; // null = sem expiração (permanente)
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
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
  // Usa select('*') para tolerar variações de schema (nome vs name, premium_until opcional)
  const { data: planRows } = await supabase
    .from('users')
    .select('*');

  const planMap = new Map((planRows ?? []).map((u: any) => [u.id, u]));

  const now = new Date();
  const users = authData.users.map((u) => {
    const pub = planMap.get(u.id) as any;
    let plan: 'free' | 'premium' = (pub?.plan ?? 'free') as 'free' | 'premium';
    const premiumUntil: string | null = pub?.premium_until ?? null;
    // Auto-expirar: se premium_until passou, considerar free na exibição
    if (plan === 'premium' && premiumUntil && new Date(premiumUntil) < now) {
      plan = 'free';
    }
    return {
      id: u.id,
      email: u.email ?? '',
      // Suporta tanto coluna 'nome' quanto 'name' conforme versão do schema
      name: pub?.nome ?? pub?.name ?? (u.user_metadata?.name as string) ?? null,
      plan,
      premium_until: premiumUntil,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return NextResponse.json({ users });
}

// PATCH /api/admin/users — alterar plano de um usuário
export async function PATCH(req: NextRequest) {
  const { ok, error } = await verifyAdmin(req);
  if (!ok) return NextResponse.json({ error }, { status: 403 });

  let body: { userId: string; plan: 'free' | 'premium'; days?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { userId, plan, days } = body;
  if (!userId || !['free', 'premium'].includes(plan)) {
    return NextResponse.json({ error: 'Campos inválidos' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Buscar email/nome do usuário para upsert (necessário pois a linha pode não existir)
  const { data: authUserData } = await supabase.auth.admin.getUserById(userId);
  const email = authUserData?.user?.email ?? '';
  const nome: string =
    (authUserData?.user?.user_metadata?.name as string) ||
    email.split('@')[0] ||
    'Usuário';

  const premium_until = plan === 'premium' ? calcPremiumUntil(days) : null;

  // Tenta upsert com premium_until (requer migration 20260315).
  // Se falhar (coluna não existe ainda), faz upsert só com plan — garante que o plano
  // é sempre salvo mesmo sem a migration ter sido rodada.
  let upsertError: any = null;

  const r1 = await supabase.from('users').upsert(
    { id: userId, email, nome, plan, premium_until },
    { onConflict: 'id' },
  );
  upsertError = r1.error;

  if (upsertError) {
    // Fallback: upsert sem a coluna premium_until
    const r2 = await supabase.from('users').upsert(
      { id: userId, email, nome, plan },
      { onConflict: 'id' },
    );
    upsertError = r2.error;
  }

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ success: true, premium_until });
}
