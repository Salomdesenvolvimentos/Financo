// ============================================
// AI ChatBot Service - Versão Simples 100% Gratuita
// ============================================

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
  type: 'warning' | 'success' | 'info' | 'tip' | 'analysis' | 'recommendation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: Date;
}

// ============================================
// Serviço Principal do ChatBot - IA Simples
// ============================================

export class AIChatBotService {
  private conversationHistory: ChatMessage[] = [];

  constructor() {
    // IA Simples não precisa de inicialização
  }

  // Testar conexão (sempre funciona)
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
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
        recentTransactions: transactionsResult.slice(0, 10),
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

  // Processar mensagem do usuário - IA Simples
  async processMessage(
    userId: string, 
    message: string, 
    context: FinancialContext
  ): Promise<string> {
    try {
      // Adicionar ao histórico
      this.conversationHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Gerar resposta baseada em regras
      const response = this.generateRuleBasedResponse(message, context);
      
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
      console.error('Erro ao processar mensagem:', error);
      return 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.';
    }
  }

  // Gerar resposta baseada em regras
  private generateRuleBasedResponse(message: string, context: FinancialContext): string {
    const lowerMessage = message.toLowerCase();
    const { summary, forecast, month, year } = context;

    // Saudações
    if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('bom dia')) {
      return `👋 Olá! Sou a Financo AI, sua assistente financeira! Posso ajudar com análise de gastos, economia e dicas financeiras. Como posso ajudar você hoje?`;
    }

    // Perguntas sobre saúde financeira
    if (lowerMessage.includes('saúde financeira') || lowerMessage.includes('como estou') || lowerMessage.includes('situação')) {
      if (!summary) {
        return '📊 Para analisar sua saúde financeira, preciso de mais dados. Tente adicionar algumas transações primeiro!';
      }
      
      const saldoPercent = (summary.saldo / summary.total_receitas) * 100;
      let healthStatus = '';
      
      if (summary.saldo > 0 && saldoPercent > 20) {
        healthStatus = '🟢 **Excelente!** Seu saldo é positivo e você tem uma boa margem de economia.';
      } else if (summary.saldo > 0) {
        healthStatus = '🟡 **Boa!** Seu saldo é positivo, mas poderia ser melhor.';
      } else {
        healthStatus = '🔴 **Atenção!** Seu saldo está negativo. Precisa de ajustes urgentes.';
      }

      return `${healthStatus}\n\n📈 **Resumo ${month}/${year}:**\n• Receitas: R$${summary.total_receitas.toFixed(2)}\n• Despesas: R$${summary.total_despesas.toFixed(2)}\n• Saldo: R$${summary.saldo.toFixed(2)}\n• Economia: R$${summary.economia.toFixed(2)}`;
    }

    // Perguntas sobre economia
    if (lowerMessage.includes('economizar') || lowerMessage.includes('economia') || lowerMessage.includes('poupar')) {
      if (!summary) {
        return '💡 Para dicas de economia, preciso analisar seus gastos primeiro. Adicione suas transações!';
      }

      const tips = [
        '📱 Cancele assinaturas não utilizadas',
        '🍳 Cozinhe em casa em vez de comer fora',
        '🚗 Use transporte público quando possível',
        '🛒 Faça lista de compras e evite impulsos',
        '💰 Separe 10% da receita para economia automática'
      ];

      return `💰 **Dicas de Economia para você:**\n\n${tips.join('\n')}\n\n💡 **Seu potencial:** Com suas receitas de R$${summary.total_receitas.toFixed(2)}, você poderia economizar R$${(summary.total_receitas * 0.1).toFixed(2)} por mês (10%).`;
    }

    // Perguntas sobre despesas
    if (lowerMessage.includes('despesas') || lowerMessage.includes('gastos') || lowerMessage.includes('gastar')) {
      if (!summary) {
        return '📊 Para analisar suas despesas, preciso dos seus dados financeiros.';
      }

      const despesaPercent = (summary.total_despesas / summary.total_receitas) * 100;
      let analysis = '';

      if (despesaPercent > 90) {
        analysis = '🔴 **Crítico!** Suas despesas estão muito altas!';
      } else if (despesaPercent > 70) {
        analysis = '🟡 **Atenção!** Suas despesas estão elevadas.';
      } else {
        analysis = '🟢 **Bom!** Suas despesas estão controladas.';
      }

      return `${analysis}\n\n📊 **Análise de Despesas:**\n• Total: R$${summary.total_despesas.toFixed(2)} (${despesaPercent.toFixed(1)}% das receitas)\n• Ideal: Abaixo de 70%\n• Economia potencial: R$${((summary.total_receitas * 0.7) - summary.total_despesas).toFixed(2)}`;
    }

    // Perguntas sobre investimentos
    if (lowerMessage.includes('investir') || lowerMessage.includes('investimento') || lowerMessage.includes('rendimento')) {
      return `📈 **Dicas de Investimento:**\n\n🎯 **Para iniciantes:**\n• Tesouro Selic: Seguro e rende acima da inflação\n• CDBs de bancos grandes: Seguro e prático\n• Fundos DI: Renda diária e baixo risco\n\n💡 **Regra de ouro:** Tenha uma reserva de emergência antes de investir!\n\n🚀 **Seu perfil:** Com base em suas finanças, comece pequeno e aumente gradualmente.`;
    }

    // Perguntas sobre orçamento
    if (lowerMessage.includes('orçamento') || lowerMessage.includes('planejar') || lowerMessage.includes('metas')) {
      return `📋 **Planejamento Financeiro:**\n\n🎯 **Regra 50-30-20:**\n• 50% para despesas essenciais\n• 30% para desejos e lazer\n• 20% para economia e investimentos\n\n📅 **Metas sugeridas:**\n• Curto prazo: Economia de emergência (3-6 meses)\n• Médio prazo: Compras importantes\n• Longo prazo: Aposentadoria\n\n💡 **Dica:** Automatize suas economias!`;
    }

    // Resposta padrão
    return `🤖 **Financo AI** aqui para ajudar! 💪\n\nPosso analisar:\n• 📊 Saúde financeira\n• 💰 Dicas de economia\n• 📈 Análise de despesas\n• 🎯 Planejamento\n• 📚 Dicas de investimento\n\nTente perguntar: "Como está minha saúde financeira?" ou "Como posso economizar mais?"`;
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
