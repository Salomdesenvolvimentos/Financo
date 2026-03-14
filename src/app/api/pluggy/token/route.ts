import { NextRequest, NextResponse } from 'next/server';
import { getPluggyApiKey, pluggyConfigured, requireAuth } from '../_utils';

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (!pluggyConfigured()) {
    return NextResponse.json(
      { error: 'Pluggy não configurado. Adicione PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local' },
      { status: 503 }
    );
  }
  try {
    const apiKey = await getPluggyApiKey();
    const res = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    });
    if (!res.ok) throw new Error('Falha ao gerar connect token');
    const { accessToken } = await res.json();
    return NextResponse.json({ accessToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
