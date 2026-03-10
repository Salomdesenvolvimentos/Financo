import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pluggy envia o clientId no header para validar a origem
function isValidPluggyRequest(req: NextRequest): boolean {
  const clientId = req.headers.get('x-pluggy-client-id');
  return clientId === process.env.PLUGGY_CLIENT_ID;
}

export async function POST(req: NextRequest) {
  // Valida que a requisição veio do Pluggy
  if (!isValidPluggyRequest(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { event, itemId } = body;

  // Log para monitoramento (visível nos logs do Vercel)
  console.log('[Pluggy Webhook]', event, itemId);

  // Para eventos que não precisam de ação imediata, apenas confirma recebimento
  if (!['item/updated', 'transactions/created', 'transactions/updated', 'transactions/deleted'].includes(event)) {
    return NextResponse.json({ received: true });
  }

  try {
    // Usa service role para escrever no Supabase sem autenticação de usuário
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Registra o evento para processamento assíncrono
    // (você pode processar aqui ou usar uma fila)
    const { error } = await supabase
      .from('pluggy_webhook_events')
      .insert({
        event,
        item_id: itemId,
        payload: body,
        processed: false,
      });

    if (error) {
      // Tabela pode não existir ainda — não falha o webhook
      console.warn('[Pluggy Webhook] Erro ao salvar evento:', error.message);
    }
  } catch (err: any) {
    console.warn('[Pluggy Webhook] Erro interno:', err.message);
  }

  return NextResponse.json({ received: true });
}
