// ============================================
// API Route: /api/ai
// Proxy server-side para OpenAI – a chave nunca é exposta ao cliente
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server-auth';

const MAX_SYSTEM_PROMPT_LENGTH = 4000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES = 20;

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key não configurada.' },
      { status: 503 }
    );
  }

  let body: { messages: { role: string; content: string }[]; systemPrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const { messages, systemPrompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Campo "messages" obrigatório.' }, { status: 400 });
  }

  // Sanitize: limit array size and individual message length to prevent abuse.
  const sanitizedMessages = messages
    .slice(0, MAX_MESSAGES)
    .map(m => ({
      role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
      content: String(m.content).slice(0, MAX_MESSAGE_LENGTH),
    }));

  const sanitizedSystemPrompt = systemPrompt
    ? String(systemPrompt).slice(0, MAX_SYSTEM_PROMPT_LENGTH)
    : 'Você é um assistente financeiro.';

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
          { role: 'system', content: sanitizedSystemPrompt },
          ...sanitizedMessages,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[/api/ai]', message);
    return NextResponse.json({ error: 'Erro ao contactar OpenAI.' }, { status: 500 });
  }
}

// Endpoint leve para verificar se a chave está configurada (requer autenticação)
export async function GET(req: NextRequest) {
  const userId = await verifyAuth(req);
  if (!userId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) });
}
