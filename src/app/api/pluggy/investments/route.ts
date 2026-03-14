import { NextRequest, NextResponse } from 'next/server';
import { getPluggyApiKey, pluggyConfigured, requireAuth } from '../_utils';

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (!pluggyConfigured()) {
    return NextResponse.json({ error: 'Pluggy não configurado' }, { status: 503 });
  }
  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 });

  try {
    const apiKey = await getPluggyApiKey();

    // Fetch all pages to avoid missing investments (e.g. caixinhas)
    let allResults: any[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetch(
        `https://api.pluggy.ai/investments?itemId=${itemId}&page=${page}&pageSize=100`,
        { headers: { 'X-API-KEY': apiKey } }
      );
      const data = await res.json();
      allResults = allResults.concat(data.results ?? []);
      totalPages = data.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return NextResponse.json({ results: allResults, total: allResults.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
