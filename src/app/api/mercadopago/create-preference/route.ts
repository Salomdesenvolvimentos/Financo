// ============================================
// API: Mercado Pago — Criar Preferência de Pagamento
// POST /api/mercadopago/create-preference
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getPremiumPrice(): Promise<number> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'premium_price')
      .single();
    const price = parseFloat(data?.value ?? '');
    return isNaN(price) || price <= 0 ? 29.9 : price;
  } catch {
    return 29.9;
  }
}

export async function POST(req: NextRequest) {
  // Autenticar o usuário via Bearer token
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const userId = authData.user.id;
  const email = authData.user.email ?? '';

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json({ error: 'Gateway de pagamento não configurado.' }, { status: 503 });
  }

  const price = await getPremiumPrice();
  const priceLabel = price.toFixed(2).replace('.', ',');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
  const preferenceClient = new Preference(client);

  try {
    const result = await preferenceClient.create({
      body: {
        items: [
          {
            id: 'financo-premium-mensal',
            title: `Financo Premium — 1 mês`,
            description: `Acesso completo ao Financo Premium por 30 dias (R$${priceLabel}/mês)`,
            quantity: 1,
            unit_price: price,
            currency_id: 'BRL',
          },
        ],
        payer: { email },
        back_urls: {
          success: `${appUrl}/dashboard/subscription?mp_status=approved`,
          failure: `${appUrl}/dashboard/subscription?mp_status=failure`,
          pending: `${appUrl}/dashboard/subscription?mp_status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        metadata: {
          user_id: userId,
          user_email: email,
        },
        statement_descriptor: 'FINANCO PREMIUM',
        binary_mode: true,
      },
    });

    if (!result.init_point) {
      console.error('[MP] Preferência criada mas init_point ausente:', JSON.stringify(result));
      return NextResponse.json({ error: 'Resposta inválida do Mercado Pago.' }, { status: 502 });
    }

    return NextResponse.json({ url: result.init_point });
  } catch (err: unknown) {
    // O SDK do MP lança objetos customizados — serializar tudo para diagnóstico
    let detail: string;
    try {
      detail = JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      detail = String(err);
    }
    console.error('[MP] Erro ao criar preferência:', detail);
    return NextResponse.json(
      { error: 'Erro no gateway de pagamento.', detail },
      { status: 502 },
    );
  }
}
