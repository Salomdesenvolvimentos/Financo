// ============================================
// AI ChatBot Service – OpenAI gpt-4o-mini
// Mesma interface do ai-chatbot-simple.ts,
// porém com inteligência real via GPT-4o-mini.
// A chave de API fica no servidor (/api/ai).
// ============================================

import { getFinancialSummary, getCategoryExpenses } from '@/services/analytics.local';
import type { CategorySummary, Transaction } from '@/types';
import { getTransactions } from '@/services/transactions.local';

// ──────────────────────────────────────────
// Tipos (espelhados do serviço simples)
// ──────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FinancialContext {
  summary?: {
    total_receitas: number;
    total_despesas: number;
    saldo: number;
    economia: number;
  };
  topCategories?: Array<{ nome: string; total: number; tipo: string }>;
  recentTransactions?: Array<{
    descricao: string;
    valor: number;
    categoria: string;
    tipo: string;
    data: string;
  }>;
  month: number;
  year: number;
}

export interface AIInsight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'tip' | 'analysis' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: Date;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildSystemPrompt(context: FinancialContext): string {
  const monthNames = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  const monthName = monthNames[context.month - 1];

  let prompt = `Você é Financo AI, um assistente financeiro pessoal inteligente e amigável.
Responda sempre em português do Brasil, de forma clara, direta e com emojis quando apropriado.
Seja conciso (máximo 5 parágrafos). Não repita dados que o usuário já sabe.
Use formatação Markdown simples (negrito, listas) para facilitar a leitura.

📅 Contexto atual: ${monthName} de ${context.year}\n`;

  if (context.summary) {
    const s = context.summary;
    const pct = s.total_receitas > 0
      ? ((s.total_despesas / s.total_receitas) * 100).toFixed(1)
      : '0';

    prompt += `
💰 Resumo financeiro do mês:
- Receitas:  ${fmt(s.total_receitas)}
- Despesas:  ${fmt(s.total_despesas)} (${pct}% das receitas)
- Saldo:     ${fmt(s.saldo)}
- Economia:  ${fmt(s.economia)}\n`;
  }

  if (context.topCategories?.length) {
    prompt += `\n📊 Top categorias de despesa:\n`;
    context.topCategories.slice(0, 5).forEach(c => {
      prompt += `- ${c.nome}: ${fmt(c.total)}\n`;
    });
  }

  if (context.recentTransactions?.length) {
    prompt += `\n🧾 Últimas transações:\n`;
    context.recentTransactions.slice(0, 8).forEach(t => {
      const sinal = t.tipo === 'receita' ? '+' : '-';
      prompt += `- ${t.data} | ${t.descricao} | ${sinal}${fmt(Math.abs(t.valor))} | ${t.categoria}\n`;
    });
  }

  return prompt;
}

// ──────────────────────────────────────────
// Serviço Principal
// ──────────────────────────────────────────

export class AIChatBotService {
  private conversationHistory: ChatMessage[] = [];
  private _configured: boolean | null = null;

  constructor() {}

  /** Verifica se a OPENAI_API_KEY está configurada no servidor */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/ai');
      const data = await res.json();
      this._configured = data.configured === true;
      return this._configured
        ? { success: true }
        : { success: false, error: 'OPENAI_API_KEY não configurada no servidor.' };
    } catch {
      return { success: false, error: 'Não foi possível contactar /api/ai.' };
    }
  }

  /** Busca contexto financeiro real do usuário */
  async getFinancialContext(userId: string, year: number, month: number): Promise<FinancialContext> {
    try {
      const monthDate = new Date(year, month - 1);
      const mesStr = `${year}-${String(month).padStart(2, '0')}`;

      const [summaryRaw, transactionsRaw, categoriesRaw] = await Promise.all([
        getFinancialSummary(userId, monthDate),
        getTransactions({ mes: mesStr }),
        getCategoryExpenses(userId, monthDate, 'despesa'),
      ]);

      const summary = summaryRaw
        ? {
            total_receitas: summaryRaw.receita_total ?? 0,
            total_despesas: summaryRaw.despesa_total ?? 0,
            saldo: summaryRaw.saldo ?? 0,
            economia: summaryRaw.saldo > 0 ? summaryRaw.saldo : 0,
          }
        : undefined;

      const topCategories = (categoriesRaw as CategorySummary[])
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(c => ({ nome: c.categoria_nome, total: c.total, tipo: 'despesa' as const }));

      const recentTransactions = ((transactionsRaw as unknown) as Transaction[])
        .slice(0, 10)
        .map(t => ({
          descricao: t.descricao,
          valor: Number(t.valor),
          categoria: t.categoria?.nome ?? 'Sem categoria',
          tipo: t.tipo,
          data: t.data_transacao,
        }));

      return { summary, topCategories, recentTransactions, month, year };
    } catch (err) {
      console.error('[AIChatBotService] getFinancialContext:', err);
      return { month, year };
    }
  }

  /** Insights rápidos (baseados em regras, sem custo de API) */
  async generateInsights(context: FinancialContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    const { summary } = context;
    if (!summary) return insights;

    if (summary.saldo < 0) {
      insights.push({
        id: '1',
        type: 'warning',
        priority: 'high',
        title: '⚠️ Saldo Negativo',
        content: `Seu saldo está negativo em ${fmt(Math.abs(summary.saldo))}. Revise suas despesas.`,
        timestamp: new Date(),
      });
    }

    if (summary.economia > 0 && summary.total_receitas > 0) {
      insights.push({
        id: '2',
        type: 'success',
        priority: 'medium',
        title: '💰 Boa Economia',
        content: `Você economizou ${fmt(summary.economia)} este mês!`,
        timestamp: new Date(),
      });
    }

    const pct = summary.total_receitas > 0
      ? (summary.total_despesas / summary.total_receitas) * 100
      : 0;

    if (pct > 90) {
      insights.push({
        id: '3',
        type: 'warning',
        priority: 'high',
        title: '📊 Despesas Elevadas',
        content: `Suas despesas representam ${pct.toFixed(0)}% das receitas. O ideal é abaixo de 70%.`,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /** Envia mensagem para o GPT-4o-mini via /api/ai */
  async processMessage(
    _userId: string,
    message: string,
    context: FinancialContext
  ): Promise<string> {
    // Adicionar ao histórico
    this.conversationHistory.push({
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Manter apenas as últimas 8 mensagens de contexto para a API (custo)
    const last8 = this.conversationHistory.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: last8,
          systemPrompt: buildSystemPrompt(context),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? 'Erro desconhecido');
      }

      const reply: string = data.content ?? 'Não consegui gerar uma resposta.';

      this.conversationHistory.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      });

      // Limitar histórico a 20 mensagens
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return reply;
    } catch (err: any) {
      console.error('[AIChatBotService] processMessage:', err);
      const msg: string = err?.message ?? '';
      if (msg.includes('quota') || msg.includes('billing') || msg.includes('exceeded')) {
        return '❌ **Limite de créditos OpenAI atingido.**\n\nPara continuar usando o assistente, acesse [platform.openai.com](https://platform.openai.com/account/billing) e adicione créditos à sua conta.';
      }
      if (msg.includes('API key') || msg.includes('Unauthorized') || msg.includes('401')) {
        return '❌ **Chave de API inválida ou não configurada.**\n\nVerifique se a variável `OPENAI_API_KEY` está corretamente definida no Vercel.';
      }
      return '❌ Não consegui processar sua mensagem agora. Tente novamente em alguns instantes.';
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }
}

// Instância global
export const aiChatBot = new AIChatBotService();
