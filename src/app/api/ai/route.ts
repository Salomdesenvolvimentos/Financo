// ============================================
// API Route: /api/ai
// Proxy server-side para OpenAI – a chave nunca é exposta ao cliente
// ============================================

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key não configurada. Adicione OPENAI_API_KEY nas variáveis de ambiente.' },
      { status: 503 }
    );
  }

  let body: { messages: { role: string; content: string }[]; systemPrompt: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const { messages, systemPrompt } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Campo "messages" obrigatório.' }, { status: 400 });
  }

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt || 'Você é um assistente financeiro.' },
          ...messages,
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.json().catch(() => ({}));
      const msg = (errBody as any)?.error?.message || `Erro OpenAI: ${openaiRes.status}`;
      return NextResponse.json({ error: msg }, { status: openaiRes.status });
    }

    const data = await openaiRes.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('[/api/ai]', err);
    return NextResponse.json({ error: 'Erro ao contactar OpenAI.' }, { status: 500 });
  }
}

// Endpoint leve para verificar se a chave está configurada
export async function GET() {
  const configured = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({ configured });
}
