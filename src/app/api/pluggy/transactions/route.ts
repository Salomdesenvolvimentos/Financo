export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPluggyApiKey, pluggyConfigured, requireAuth } from '../_utils'; {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (!pluggyConfigured()) {
    return NextResponse.json({ error: 'Pluggy não configurado' }, { status: 503 });
  }
  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 });

  const from = req.nextUrl.searchParams.get('from') ?? '';
  const to = req.nextUrl.searchParams.get('to') ?? '';

  try {
    const apiKey = await getPluggyApiKey();
    const params = new URLSearchParams({ accountId, pageSize: '500' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const res = await fetch(`https://api.pluggy.ai/transactions?${params}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
