// ============================================
// AI ChatBot Service - Hugging Face Implementation
// ============================================

import { HfInference } from '@huggingface/inference';

// ============================================
// Tipos e Interfaces
// ============================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface FinancialContext {
  summary?: {
    total_receitas: number;
    total_despesas: number;
    saldo: number;
    economia: number;
  };
  forecast?: {
    previsto_receitas: number;
    previsto_despesas: number;
    previsto_saldo: number;
  };
  recentTransactions?: Array<{
    descricao: string;
    valor: number;
    categoria: string;
    data: string;
  }>;
  month: number;
  year: number;
}

interface AIInsight {
  id: string;
  type: 'warning' | 'success' | 'info';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: Date;
}

// ============================================
// Configuração Hugging Face
// ============================================

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || 'hf_demo'); // Demo key funciona sem cadastro

// ============================================
// Serviço Principal do ChatBot
// ============================================

export class AIChatBotService {
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    // Hugging Face não precisa de inicialização especial
  }

  // Testar conexão com API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPrompt = 'Responda apenas com "OK" para teste de conexão.';
      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: testPrompt,
        parameters: {
          max_new_tokens: 10,
          temperature: 0.1,
        }
      });

      if (response.generated_text && response.generated_text.includes('OK')) {
        return { success: true };
      } else {
        return { success: false, error: 'Resposta inesperada da API' };
      }
    } catch (error: any) {
      console.error('Erro no teste de conexão:', error);
      return { 
        success: false, 
        error: error.message || 'Erro desconhecido ao conectar com Hugging Face' 
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
          data_fim: `${year}-${String(month).padStart(2, '0')}-31`,
          user_id: userId
        }),
        getMonthlyForecast(userId, year, month)
      ]);

      return {
        summary: summaryResult,
        recentTransactions: transactionsResult.slice(0, 10), // Últimas 10 transações
        forecast: forecastResult,
        month,
        year
      };
    } catch (error) {
      console.error('Erro ao obter contexto financeiro:', error);
      return { month, year };
    }
  }

  // Gerar insights automáticos baseados nos dados
  async generateInsights(context: FinancialContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    const { summary, forecast, month, year } = context;

    if (!summary) return insights;

    // Análise de saldo
    if (summary.saldo < 0) {
      insights.push({
        id: Date.now().toString(),
        type: 'warning',
        priority: 'high',
        title: '⚠️ Saldo Negativo',
        content: `Seu saldo este mês está negativo em R$${Math.abs(summary.saldo).toFixed(2)}. Considere reduzir despesas.`,
        timestamp: new Date()
      });
    }

    // Análise de economia
    if (summary.economia > 0) {
      insights.push({
        id: (Date.now() + 1).toString(),
        type: 'success',
        priority: 'medium',
        title: '💰 Ótima Economia',
        content: `Você economizou R$${summary.economia.toFixed(2)} este mês! Continue assim.`,
        timestamp: new Date()
      });
    }

    // Análise de despesas vs receitas
    const despesaPercentual = (summary.total_despesas / summary.total_receitas) * 100;
    if (despesaPercentual > 90) {
      insights.push({
        id: (Date.now() + 2).toString(),
        type: 'warning',
        priority: 'high',
        title: '📊 Despesas Altas',
        content: `Suas despesas representam ${despesaPercentual.toFixed(1)}% das receitas. Tente manter abaixo de 70%.`,
        timestamp: new Date()
      });
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
      // Construir prompt com contexto financeiro
      const prompt = this.buildFinancialPrompt(message, context);
      
      // Adicionar ao histórico
      this.conversationHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      console.log('Enviando requisição para Hugging Face...');
      
      // Gerar resposta com Hugging Face
      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          return_full_text: false
        }
      });

      const generatedText = response.generated_text;
      
      if (!generatedText || generatedText.trim() === '') {
        throw new Error('Resposta vazia da API Hugging Face');
      }

      // Limpar a resposta (remover o prompt original)
      const cleanResponse = generatedText.replace(prompt, '').trim();

      // Adicionar resposta ao histórico
      this.conversationHistory.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanResponse,
        timestamp: new Date()
      });

      // Manter apenas as últimas 10 mensagens
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      return cleanResponse;
    } catch (error: any) {
      console.error('Erro detalhado ao processar mensagem:', error);
      
      // Tratamento específico para diferentes tipos de erro
      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        return '⚠️ Limite excedido: Muitas requisições simultâneas. Tente novamente em alguns segundos.';
      }
      
      if (error.message?.includes('model') || error.message?.includes('loading')) {
        return '⚠️ Modelo carregando: O sistema está atualizando. Tente novamente em instantes.';
      }
      
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return '⚠️ Erro de conexão: Problema ao conectar com o servidor. Verifique sua internet.';
      }

      // Erro genérico com detalhes técnicos
      return `❌ Erro ao processar sua solicitação: ${error.message || 'Erro desconhecido'}. Tente novamente.`;
    }
  }

  // Construir prompt com contexto financeiro
  private buildFinancialPrompt(message: string, context: FinancialContext): string {
    const { summary, forecast, recentTransactions, month, year } = context;

    let contextInfo = '';

    if (summary) {
      contextInfo += `
RESUMO FINANCEIRO - ${month}/${year}:
• Receitas: R$${summary.total_receitas.toFixed(2)}
• Despesas: R$${summary.total_despesas.toFixed(2)}
• Saldo: R$${summary.saldo.toFixed(2)}
• Economia: R$${summary.economia.toFixed(2)}
`;
    }

    if (forecast) {
      contextInfo += `
PREVISÃO MENSAL:
• Receitas Previstas: R$${forecast.previsto_receitas.toFixed(2)}
• Despesas Previstas: R$${forecast.previsto_despesas.toFixed(2)}
• Saldo Previsto: R$${forecast.previsto_saldo.toFixed(2)}
`;
    }

    if (recentTransactions && recentTransactions.length > 0) {
      contextInfo += `
TRANSAÇÕES RECENTES:
${recentTransactions.slice(0, 5).map(t => `• ${t.descricao}: R$${t.valor.toFixed(2)} (${t.categoria})`).join('\n')}
`;
    }

    const systemPrompt = `Você é um assistente financeiro especializado chamado Financo AI. 
Sua missão é ajudar o usuário a gerenciar melhor suas finanças pessoais.

Regras:
1. Responda sempre em português brasileiro
2. Seja objetivo e prático
3. Forneça sugestões acionáveis
4. Use emojis para tornar a conversa mais amigável
5. Baseie suas respostas nos dados financeiros fornecidos
6. Se não houver dados suficientes, peça mais informações

${contextInfo}

PERGUNTA DO USUÁRIO: ${message}

RESPOSTA:`;

    return systemPrompt;
  }

  // Limpar histórico
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // Obter histórico
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }
}

// ============================================
// Instância Global
// ============================================

export const aiChatBot = new AIChatBotService();

// ============================================
// Funções Auxiliares (mocks - substituir com reais)
// ============================================

async function getFinancialSummary(userId: string, date: Date) {
  // Mock - substituir com chamada real ao Supabase
  return {
    total_receitas: 5000,
    total_despesas: 3200,
    saldo: 1800,
    economia: 800
  };
}

async function getTransactions(filters: any) {
  // Mock - substituir com chamada real ao Supabase
  return [
    { descricao: 'Supermercado', valor: -250, categoria: 'Alimentação', data: '2024-01-15' },
    { descricao: 'Salário', valor: 3000, categoria: 'Receita', data: '2024-01-05' },
    { descricao: 'Aluguel', valor: -1200, categoria: 'Moradia', data: '2024-01-01' }
  ];
}

async function getMonthlyForecast(userId: string, year: number, month: number) {
  // Mock - substituir com chamada real
  return {
    previsto_receitas: 5500,
    previsto_despesas: 3500,
    previsto_saldo: 2000
  };
}
