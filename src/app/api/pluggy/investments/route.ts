import { NextRequest, NextResponse } from 'next/server';
import { getPluggyApiKey, pluggyConfigured } from '../_utils';

export async function GET(req: NextRequest) {
  if (!pluggyConfigured()) {
    return NextResponse.json({ error: 'Pluggy não configurado' }, { status: 503 });
  }
  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 });

  try {
    const apiKey = await getPluggyApiKey();
    const res = await fetch(`https://api.pluggy.ai/investments?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    });
    return NextResponse.json(await res.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
