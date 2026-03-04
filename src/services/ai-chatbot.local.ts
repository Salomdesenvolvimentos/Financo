// ============================================
// FINACO - Services: IA Financeira
// ChatBot com insights financeiros personalizados
// ============================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getFinancialSummary } from './analytics.local';
import { getTransactions } from './transactions.local';
import { calculateMonthlyForecast } from './forecast.local';
import type { FinancialSummary, MonthlyForecast } from '@/types';

// Inicializar Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// ============================================
// Tipos para o ChatBot
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FinancialContext {
  summary: FinancialSummary | null;
  forecast: MonthlyForecast | null;
  recentTransactions: any[];
  month: string;
  year: number;
}

export interface AIInsight {
  type: 'warning' | 'tip' | 'analysis' | 'recommendation';
  title: string;
  content: string;
  actionable?: boolean;
  priority: 'high' | 'medium' | 'low';
}

// ============================================
// Serviço Principal do ChatBot
// ============================================

export class AIChatBotService {
  private model: any;
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // Testar conexão com API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.GOOGLE_GEMINI_API_KEY) {
        return { success: false, error: 'API Key não configurada no .env.local' };
      }

      const testPrompt = 'Responda apenas com "OK" para teste de conexão.';
      const result = await this.model.generateContent(testPrompt);
      const response = result.response.text();

      if (response.includes('OK')) {
        return { success: true };
      } else {
        return { success: false, error: 'Resposta inesperada da API' };
      }
    } catch (error: any) {
      console.error('Erro no teste de conexão:', error);
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido ao conectar com API Gemini' 
      };
    }
  }

  // Obter contexto financeiro do usuário
  async getFinancialContext(userId: string, year: number, month: number): Promise<FinancialContext> {
    try {
      const monthDate = new Date(year, month - 1);
      
      // Buscar dados financeiros
      const [summaryResult, transactionsResult, forecastResult] = await Promise.all([
        getFinancialSummary(userId, monthDate),
        getTransactions({
          data_inicio: `${year}-${String(month).padStart(2, '0')}-01`,
          data_fim: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
        }),
        calculateMonthlyForecast(userId, year, month)
      ]);

      return {
        summary: summaryResult || null,
        forecast: forecastResult.data || null,
        recentTransactions: transactionsResult?.data?.slice(0, 10) || [],
        month: new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' }),
        year
      };
    } catch (error) {
      console.error('Erro ao obter contexto financeiro:', error);
      return {
        summary: null,
        forecast: null,
        recentTransactions: [],
        month: new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' }),
        year
      };
    }
  }

  // Gerar insights automáticos
  async generateInsights(context: FinancialContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    if (!context.summary) return insights;

    const { summary, forecast, month } = context;

    // Insight 1: Saúde financeira
    if (summary.saldo < 0) {
      insights.push({
        type: 'warning',
        title: '⚠️ Saldo Negativo',
        content: `Você está com saldo negativo de R$ ${Math.abs(summary.saldo).toFixed(2)} em ${month}. Considere revisar seus gastos.`,
        actionable: true,
        priority: 'high'
      });
    } else if (summary.saldo > 0) {
      insights.push({
        type: 'analysis',
        title: '✅ Saldo Positivo',
        content: `Ótimo! Você tem um saldo positivo de R$ ${summary.saldo.toFixed(2)} em ${month}.`,
        actionable: false,
        priority: 'low'
      });
    }

    // Insight 2: Análise de despesas
    if (summary.despesa_total > 0) {
      const percentualEconomia = summary.receita_total > 0 
        ? ((summary.receita_total - summary.despesa_total) / summary.receita_total) * 100 
        : 0;

      if (percentualEconomia < 10) {
        insights.push({
          type: 'recommendation',
          title: '💡 Dica de Economia',
          content: `Você está economizando apenas ${percentualEconomia.toFixed(1)}% de suas receitas. Tente aumentar para pelo menos 20%.`,
          actionable: true,
          priority: 'medium'
        });
      }
    }

    // Insight 3: Previsão do mês
    if (forecast) {
      if (forecast.status === 'critico') {
        insights.push({
          type: 'warning',
          title: '🚨 Previsão Crítica',
          content: `A previsão para o fim do mês é de saldo negativo de R$ ${Math.abs(forecast.saldo_previsto_final).toFixed(2)}.`,
          actionable: true,
          priority: 'high'
        });
      } else if (forecast.status === 'alerta') {
        insights.push({
          type: 'tip',
          title: '📊 Atenção à Previsão',
          content: `A previsão é de saldo baixo de R$ ${forecast.saldo_previsto_final.toFixed(2)}. Fique atento aos gastos.`,
          actionable: true,
          priority: 'medium'
        });
      }
    }

    return insights;
  }

  // Processar mensagem do usuário
  async processMessage(
    userId: string, 
    message: string, 
    context: FinancialContext
  ): Promise<string> {
    try {
      // Verificar se API Key está configurada
      if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error('API Key do Gemini não configurada');
        return '⚠️ Erro de configuração: A API Key do Google Gemini não foi configurada. Verifique o arquivo .env.local';
      }

      // Construir prompt com contexto financeiro
      const prompt = this.buildFinancialPrompt(message, context);
      
      // Adicionar ao histórico
      this.conversationHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      console.log('Enviando requisição para Gemini...');
      
      // Gerar resposta com Gemini
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      if (!response || response.trim() === '') {
        throw new Error('Resposta vazia da API Gemini');
      }

      // Adicionar resposta ao histórico
      this.conversationHistory.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      // Manter apenas as últimas 10 mensagens
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      return response;
    } catch (error: any) {
      console.error('Erro detalhado ao processar mensagem:', error);
      
      // Tratamento específico para diferentes tipos de erro
      if (error.message?.includes('API_KEY')) {
        return '⚠️ Erro de API: A API Key do Google Gemini é inválida. Verifique se a chave está correta no arquivo .env.local';
      }
      
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        return '⚠️ Limite excedido: O limite de uso da API Gemini foi atingido. Tente novamente em alguns minutos ou use uma chave diferente.';
      }
      
      if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
        return '⚠️ Erro de conexão: Problema ao conectar com a API Gemini. Verifique sua conexão com a internet.';
      }
      
      if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
        return '⚠️ Conteúdo bloqueado: A mensagem foi bloqueada pelas políticas de segurança da Gemini. Tente reformular sua pergunta.';
      }

      // Erro genérico com detalhes técnicos
      return `❌ Erro ao processar sua solicitação: ${error.message || 'Erro desconhecido'}. Tente novamente ou entre em contato com o suporte.`;
    }
  }

  // Construir prompt com contexto financeiro
  private buildFinancialPrompt(message: string, context: FinancialContext): string {
    const { summary, forecast, recentTransactions, month, year } = context;

    let contextInfo = '';

    if (summary) {
      contextInfo += `
RESUMO FINANCEIRO DE ${month.toUpperCase()} ${year}:
- Receitas: R$ ${summary.receita_total.toFixed(2)}
- Despesas: R$ ${summary.despesa_total.toFixed(2)}
- Saldo: R$ ${summary.saldo.toFixed(2)}
`;
    }

    if (forecast) {
      contextInfo += `
PREVISÃO PARA FIM DO MÊS:
- Saldo previsto: R$ ${forecast.saldo_previsto_final.toFixed(2)}
- Status: ${forecast.status}
- Dias restantes: ${forecast.dias_restantes}
`;
    }

    if (recentTransactions.length > 0) {
      contextInfo += `
TRANSAÇÕES RECENTES:
${recentTransactions.slice(0, 5).map(t => 
  `- ${t.descricao}: R$ ${t.valor.toFixed(2)} (${t.tipo})`
).join('\n')}
`;
    }

    return `
Você é um assistente financeiro pessoal chamado "Financo AI". Seu objetivo é ajudar o usuário a entender melhor sua vida financeira e dar insights práticos.

CONTEXTO ATUAL:
${contextInfo}

HISTÓRICO RECENTE DA CONVERSA:
${this.conversationHistory.slice(-4).map(msg => 
  `${msg.role}: ${msg.content}`
).join('\n')}

PERGUNTA DO USUÁRIO: "${message}"

RESPOSTA:
- Seja sempre útil, prático e positivo
- Forneça insights baseados nos dados reais
- Sugira ações concretas quando possível
- Use linguagem simples e amigável
- Seja breve e direto (máximo 200 palavras)
- Use emojis para tornar a conversa mais agradável
`;
  }

  // Limpar histórico de conversa
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Obter histórico de conversa
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }
}

// ============================================
// Instância Global do Serviço
// ============================================

export const aiChatBot = new AIChatBotService();
