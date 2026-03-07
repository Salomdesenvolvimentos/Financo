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

export interface MonthData {
  month: number;
  year: number;
  summary?: {
    total_receitas: number;
    total_despesas: number;
    saldo: number;
    economia: number;
  };
  topCategories?: Array<{ nome: string; total: number }>;
  transactions?: Array<{
    descricao: string;
    valor: number;
    categoria: string;
    tipo: string;
    data: string;
  }>;
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
  historicalMonths?: MonthData[];
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

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function buildMonthSection(m: MonthData): string {
  const label = `${MONTH_NAMES[m.month - 1]} ${m.year}`;
  let s = `\n### 📅 ${label}\n`;

  if (m.summary) {
    const pct = m.summary.total_receitas > 0
      ? ((m.summary.total_despesas / m.summary.total_receitas) * 100).toFixed(1)
      : '0';
    s += `- Receitas: ${fmt(m.summary.total_receitas)} | Despesas: ${fmt(m.summary.total_despesas)} (${pct}%) | Saldo: ${fmt(m.summary.saldo)}\n`;
  } else {
    s += `- (sem dados registrados)\n`;
  }

  if (m.topCategories?.length) {
    s += `**Top gastos por categoria:**\n`;
    m.topCategories.forEach(c => {
      s += `  - ${c.nome}: ${fmt(c.total)}\n`;
    });
  }

  if (m.transactions?.length) {
    s += `**Transações (${m.transactions.length} registros):**\n`;
    m.transactions.slice(0, 15).forEach(t => {
      const sinal = t.tipo === 'receita' ? '+' : '-';
      s += `  - ${t.data} | ${t.descricao} | ${sinal}${fmt(Math.abs(t.valor))} | ${t.categoria}\n`;
    });
  }

  return s;
}

function buildSystemPrompt(context: FinancialContext): string {
  const monthName = MONTH_NAMES[context.month - 1];

  let prompt = `Você é Financo AI, assistente financeiro pessoal do usuário.
Responda SEMPRE em português do Brasil, de forma direta e objetiva.
Use os dados reais abaixo para responder. Se o usuário perguntar sobre um mês específico, USE os dados daquele mês.
Seja conciso (máximo 5 parágrafos). Use Markdown simples (negrito, listas) para facilitar a leitura.
NUNCA diga que não tem acesso aos dados — você tem todos os dados financeiros listados abaixo.

📅 Mês de referência: ${monthName} de ${context.year}\n`;

  if (context.historicalMonths?.length) {
    prompt += `\n## Dados Financeiros do Usuário (últimos meses)\n`;
    context.historicalMonths.forEach(m => {
      prompt += buildMonthSection(m);
    });
  } else {
    // fallback para contexto antigo (compatibilidade)
    if (context.summary) {
      const s = context.summary;
      const pct = s.total_receitas > 0
        ? ((s.total_despesas / s.total_receitas) * 100).toFixed(1)
        : '0';
      prompt += `\n💰 Resumo de ${monthName}:\n- Receitas: ${fmt(s.total_receitas)} | Despesas: ${fmt(s.total_despesas)} (${pct}%) | Saldo: ${fmt(s.saldo)}\n`;
    }
    if (context.topCategories?.length) {
      prompt += `\n📊 Top categorias:\n`;
      context.topCategories.forEach(c => { prompt += `- ${c.nome}: ${fmt(c.total)}\n`; });
    }
    if (context.recentTransactions?.length) {
      prompt += `\n🧾 Transações recentes:\n`;
      context.recentTransactions.slice(0, 10).forEach(t => {
        const sinal = t.tipo === 'receita' ? '+' : '-';
        prompt += `- ${t.data} | ${t.descricao} | ${sinal}${fmt(Math.abs(t.valor))} | ${t.categoria}\n`;
      });
    }
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

  /** Busca dados financeiros de um mês específico */
  private async fetchMonthData(userId: string, year: number, month: number): Promise<MonthData> {
    try {
      const monthDate = new Date(year, month - 1);
      const mesStr = `${year}-${String(month).padStart(2, '0')}`;

      const [summaryRaw, transactionsResult, categoriesRaw] = await Promise.all([
        getFinancialSummary(userId, monthDate),
        getTransactions({ mes: mesStr }),
        getCategoryExpenses(userId, monthDate, 'despesa'),
      ]);

      // getTransactions retorna { data: [], error: null }
      const txList: Transaction[] = (transactionsResult as any)?.data ?? [];

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
        .slice(0, 8)
        .map(c => ({ nome: c.categoria_nome, total: c.total }));

      const transactions = txList.map(t => ({
        descricao: t.descricao,
        valor: Number(t.valor),
        categoria: (t as any).categoria?.nome ?? 'Sem categoria',
        tipo: t.tipo,
        data: t.data_transacao,
      }));

      return { month, year, summary, topCategories, transactions };
    } catch (err) {
      console.error(`[AIChatBotService] fetchMonthData ${year}-${month}:`, err);
      return { month, year };
    }
  }

  /** Busca contexto financeiro dos últimos 3 meses */
  async getFinancialContext(userId: string, year: number, month: number): Promise<FinancialContext> {
    // Gera lista dos últimos 3 meses (mais recente primeiro)
    const monthsToFetch: Array<{ year: number; month: number }> = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      monthsToFetch.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const historicalMonths = await Promise.all(
      monthsToFetch.map(({ year: y, month: m }) => this.fetchMonthData(userId, y, m))
    );

    // Dados do mês mais recente para compatibilidade com insights
    const current = historicalMonths[0];
    return {
      month,
      year,
      summary: current.summary,
      topCategories: current.topCategories?.map(c => ({ ...c, tipo: 'despesa' as const })),
      recentTransactions: current.transactions?.slice(0, 10),
      historicalMonths,
    };
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
