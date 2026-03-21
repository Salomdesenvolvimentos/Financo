// ============================================
// API: Mercado Pago — Webhook de Pagamentos
// POST /api/mercadopago/webhook
// Ativado automaticamente pelo MP ao aprovar pagamento
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function activatePremium(userId: string, email: string) {
  const supabase = getServiceClient();
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + 30);

  // Tenta upsert com premium_until
  const { error } = await supabase.from('users').upsert(
    { id: userId, email, nome: email.split('@')[0], plan: 'premium', premium_until: premiumUntil.toISOString() },
    { onConflict: 'id' },
  );

  if (error) {
    // Fallback sem premium_until (schema antigo)
    await supabase.from('users').upsert(
      { id: userId, email, nome: email.split('@')[0], plan: 'premium' },
      { onConflict: 'id' },
    );
  }
}

async function findUserByEmail(email: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'Não configurado' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // MP pode enviar notificações de vários tipos (payment, merchant_order, etc.)
  // Só processar quando for pagamento
  const type = (body.type ?? body.topic) as string | undefined;
  if (type !== 'payment') {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body.data
    ? (body.data as Record<string, unknown>).id
    : body.id ?? body.resource;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  // Buscar detalhes do pagamento via API do MP (isso valida a autenticidade)
  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
  const paymentClient = new Payment(client);

  let payment;
  try {
    payment = await paymentClient.get({ id: String(paymentId) });
  } catch (err) {
    console.error('[MP Webhook] Erro ao buscar pagamento:', err);
    return NextResponse.json({ error: 'Falha ao verificar pagamento' }, { status: 500 });
  }

  // Só ativar se pagamento APROVADO
  if (payment.status !== 'approved') {
    return NextResponse.json({ ok: true });
  }

  // Identificar usuário pelo metadata (definido em create-preference)
  const meta = payment.metadata as Record<string, string> | undefined;
  let userId: string | null = meta?.user_id ?? null;
  const email: string = meta?.user_email ?? (payment.payer?.email ?? '');

  // Se não tiver user_id no metadata, tentar pelo email
  if (!userId && email) {
    userId = await findUserByEmail(email);
  }

  if (!userId) {
    console.error('[MP Webhook] Não foi possível identificar o usuário. Email:', email);
    return NextResponse.json({ error: 'Usuário não identificado' }, { status: 400 });
  }

  await activatePremium(userId, email);

  console.log(`[MP Webhook] Premium ativado para userId=${userId} email=${email} paymentId=${paymentId}`);
  return NextResponse.json({ ok: true });
}
