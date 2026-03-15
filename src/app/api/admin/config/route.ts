// ============================================
// FINANCO - API: Admin — Configurações do app
// GET  /api/admin/config?key=premium_price  (público)
// PUT  /api/admin/config                    (admin only)
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

// GET /api/admin/config?key=premium_price
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Parâmetro "key" obrigatório' }, { status: 400 });

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single();

  return NextResponse.json({ key, value: data?.value ?? null });
}

// PUT /api/admin/config — atualiza configuração (somente admin)
export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 403 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: userData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !userData.user) return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
  if (userData.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  let body: { key: string; value: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { key, value } = body;
  if (!key || value == null) return NextResponse.json({ error: 'Campos "key" e "value" obrigatórios' }, { status: 400 });

  const supabase = getServiceClient();
  const { error: dbError } = await supabase
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
