// ============================================
// FINACO - Services: Previsão Financeira
// Lógica de cálculo de previsão mensal
// ============================================

import { supabase } from '@/lib/supabase';
import { getFixedExpensesByMonth } from './fixed-expenses.local';
import { getFixedIncomeByMonth } from './fixed-income.local';
import type { MonthlyForecast, ForecastAlert, CalendarEvent } from '@/types';

// ============================================
// Previsão Mensal Principal
// ============================================

// Calcular previsão completa do mês
export async function calculateMonthlyForecast(userId: string, year: number, month: number): Promise<{ data: MonthlyForecast | null; error: string | null }> {
  try {
    // Buscar dados do mês
    const [
      fixedExpensesResult,
      fixedIncomeResult,
      transactionsResult
    ] = await Promise.all([
      getFixedExpensesByMonth(userId, year, month),
      getFixedIncomeByMonth(userId, year, month),
      getMonthTransactions(userId, year, month)
    ]);

    if (fixedExpensesResult.error || fixedIncomeResult.error || transactionsResult.error) {
      throw new Error('Erro ao buscar dados para previsão');
    }

    const fixedExpenses = fixedExpensesResult.data || [];
    const fixedIncome = fixedIncomeResult.data || [];
    const transactions = transactionsResult.data || [];

    // Calcular valores reais (transações já ocorridas)
    const receitasRealizadas = transactions
      .filter((t: any) => t.tipo === 'receita')
      .reduce((sum: number, t: any) => sum + t.valor, 0);

    const despesasRealizadas = transactions
      .filter((t: any) => t.tipo === 'despesa')
      .reduce((sum: number, t: any) => sum + t.valor, 0);

    const saldoReal = receitasRealizadas - despesasRealizadas;

    // Calcular valores previstos (gastos/rendas fixas)
    const receitasPrevistas = fixedIncome.reduce((sum: number, income: any) => sum + income.valor, 0);
    const despesasPrevistas = fixedExpenses.reduce((sum: number, expense: any) => sum + expense.valor, 0);

    // Calcular projeção final
    const saldoPrevistoFinal = saldoReal + (receitasPrevistas - despesasPrevistas);

    // Determinar status
    const status = determineForecastStatus(saldoPrevistoFinal, despesasPrevistas);

    // Metadados
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const diasRestantes = daysInMonth - currentDay;

    // Nome do mês
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesNome = monthNames[month - 1];

    const forecast: MonthlyForecast = {
      mes: `${year}-${String(month).padStart(2, '0')}`,
      ano: year,
      mes_nome: mesNome,
      receitas_realizadas: receitasRealizadas,
      despesas_realizadas: despesasRealizadas,
      saldo_real: saldoReal,
      receitas_previstas: receitasPrevistas,
      despesas_previstas: despesasPrevistas,
      saldo_previsto_final: saldoPrevistoFinal,
      dias_restantes: diasRestantes,
      dia_atual: currentDay,
      status,
      detalhes_receitas: {
        fixas: fixedIncome,
        variaveis: receitasRealizadas
      },
      detalhes_despesas: {
        fixas: fixedExpenses,
        variaveis: despesasRealizadas
      }
    };

    return { data: forecast, error: null };
  } catch (error: any) {
    console.error('Erro ao calcular previsão mensal:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// Funções Auxiliares
// ============================================

// Buscar transações do mês
async function getMonthTransactions(userId: string, year: number, month: number): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('data_transacao', monthStart)
      .lte('data_transacao', monthEnd)
      .order('data_transacao', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar transações do mês:', error);
    return { data: null, error: error.message };
  }
}

// Determinar status da previsão
function determineForecastStatus(saldoPrevisto: number, despesasTotais: number): 'positivo' | 'alerta' | 'critico' {
  if (saldoPrevisto < 0) {
    return 'critico';
  } else if (saldoPrevisto < despesasTotais * 0.1) { // Menos de 10% das despesas totais
    return 'alerta';
  } else {
    return 'positivo';
  }
}

// ============================================
// Sistema de Alertas
// ============================================

// Gerar alertas inteligentes
export async function generateForecastAlerts(userId: string, year: number, month: number): Promise<{ data: ForecastAlert[] | null; error: string | null }> {
  try {
    const alerts: ForecastAlert[] = [];

    // Buscar previsão do mês
    const forecastResult = await calculateMonthlyForecast(userId, year, month);
    if (forecastResult.error || !forecastResult.data) {
      throw new Error('Não foi possível gerar previsão para alertas');
    }

    const forecast = forecastResult.data;
    const today = new Date();
    const currentDay = today.getDate();

    // Alerta 1: Saldo insuficiente
    if (forecast.status === 'critico') {
      alerts.push({
        tipo: 'saldo_insuficiente',
        mensagem: `Atenção: Previsão de saldo negativo de R$ ${Math.abs(forecast.saldo_previsto_final).toFixed(2)}. Considere reduzir despesas.`,
        nivel: 'critico',
        valor: forecast.saldo_previsto_final
      });
    }

    // Alerta 2: Economia baixa
    if (forecast.status === 'alerta') {
      alerts.push({
        tipo: 'economia_baixa',
        mensagem: `Atenção: Previsão de economia baixa de R$ ${forecast.saldo_previsto_final.toFixed(2)}. Fique atento aos gastos.`,
        nivel: 'alerta',
        valor: forecast.saldo_previsto_final
      });
    }

    // Alerta 3: Contas vencendo em breve
    const upcomingExpenses = forecast.detalhes_despesas.fixas.filter(expense => {
      const daysUntilDue = expense.dia_vencimento - currentDay;
      return daysUntilDue >= 0 && daysUntilDue <= 5;
    });

    upcomingExpenses.forEach((expense: any) => {
      const daysUntilDue = expense.dia_vencimento - currentDay;
      alerts.push({
        tipo: 'vencimento_proximo',
        mensagem: `${expense.descricao} vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (R$ ${expense.valor.toFixed(2)})`,
        nivel: daysUntilDue <= 2 ? 'critico' : 'alerta',
        dias: daysUntilDue,
        valor: expense.valor,
        item_id: expense.id,
        item_descricao: expense.descricao
      });
    });

    // Alerta 4: Rendas pendentes
    const pendingIncome = forecast.detalhes_receitas.fixas.filter(income => {
      const daysUntilReceive = income.dia_recebimento - currentDay;
      return daysUntilReceive >= 0 && daysUntilReceive <= 3;
    });

    pendingIncome.forEach((income: any) => {
      const daysUntilReceive = income.dia_recebimento - currentDay;
      alerts.push({
        tipo: 'receita_pendente',
        mensagem: `${income.descricao} será recebida em ${daysUntilReceive} ${daysUntilReceive === 1 ? 'dia' : 'dias'} (R$ ${income.valor.toFixed(2)})`,
        nivel: 'info',
        dias: daysUntilReceive,
        valor: income.valor,
        item_id: income.id,
        item_descricao: income.descricao
      });
    });

    return { data: alerts, error: null };
  } catch (error: any) {
    console.error('Erro ao gerar alertas:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// Calendário de Eventos
// ============================================

// Gerar calendário de eventos do mês
export async function generateMonthCalendar(userId: string, year: number, month: number): Promise<{ data: CalendarEvent[] | null; error: string | null }> {
  try {
    const events: CalendarEvent[] = [];

    // Buscar dados
    const [
      fixedExpensesResult,
      fixedIncomeResult,
      transactionsResult
    ] = await Promise.all([
      getFixedExpensesByMonth(userId, year, month),
      getFixedIncomeByMonth(userId, year, month),
      getMonthTransactions(userId, year, month)
    ]);

    if (fixedExpensesResult.error || fixedIncomeResult.error || transactionsResult.error) {
      throw new Error('Erro ao buscar dados para calendário');
    }

    const fixedExpenses = fixedExpensesResult.data || [];
    const fixedIncome = fixedIncomeResult.data || [];
    const transactions = transactionsResult.data || [];

    // Adicionar gastos fixos
    fixedExpenses.forEach((expense: any) => {
      events.push({
        id: `fixed-expense-${expense.id}`,
        tipo: 'despesa_fixa',
        descricao: expense.descricao,
        valor: expense.valor,
        dia: expense.dia_vencimento,
        status: 'pendente',
        categoria: expense.categoria?.nome,
        cor: '#ef4444' // vermelho
      });
    });

    // Adicionar rendas fixas
    fixedIncome.forEach((income: any) => {
      events.push({
        id: `fixed-income-${income.id}`,
        tipo: 'receita_fixa',
        descricao: income.descricao,
        valor: income.valor,
        dia: income.dia_recebimento,
        status: 'pendente',
        cor: '#10b981' // verde
      });
    });

    // Adicionar transações realizadas
    transactions.forEach((transaction: any) => {
      const day = new Date(transaction.data_transacao).getDate();
      events.push({
        id: `transaction-${transaction.id}`,
        tipo: transaction.tipo === 'receita' ? 'receita_realizada' : 'despesa_realizada',
        descricao: transaction.descricao,
        valor: transaction.valor,
        dia: day,
        status: transaction.tipo === 'receita' ? 'realizado' : 
                transaction.status === 'pago' ? 'realizado' : 
                new Date(transaction.data_vencimento || transaction.data_transacao) < new Date() ? 'vencido' : 'pendente',
        categoria: transaction.categoria?.nome,
        cor: transaction.tipo === 'receita' ? '#10b981' : '#ef4444'
      });
    });

    // Ordenar eventos por dia
    events.sort((a, b) => a.dia - b.dia);

    return { data: events, error: null };
  } catch (error: any) {
    console.error('Erro ao gerar calendário:', error);
    return { data: null, error: error.message };
  }
}

// ============================================
// Projeções Avançadas
// ============================================

// Calcular projeção para próximos meses
export async function calculateMultiMonthForecast(userId: string, startYear: number, startMonth: number, months: number): Promise<{ data: MonthlyForecast[] | null; error: string | null }> {
  try {
    const forecasts: MonthlyForecast[] = [];
    
    for (let i = 0; i < months; i++) {
      const year = startMonth + i > 12 ? startYear + 1 : startYear;
      const month = ((startMonth - 1 + i) % 12) + 1;
      
      const result = await calculateMonthlyForecast(userId, year, month);
      if (result.error || !result.data) {
        throw new Error(`Erro ao calcular previsão para ${year}-${month}`);
      }
      
      forecasts.push(result.data);
    }

    return { data: forecasts, error: null };
  } catch (error: any) {
    console.error('Erro ao calcular projeção multi-mês:', error);
    return { data: null, error: error.message };
  }
}

// Calcular necessidade de usar salário (para adiantamentos)
export async function calculateSalaryNeed(userId: string, year: number, month: number): Promise<{ data: { needsSalary: boolean; shortage: number; availableSalary: number } | null; error: string | null }> {
  try {
    const forecastResult = await calculateMonthlyForecast(userId, year, month);
    if (forecastResult.error || !forecastResult.data) {
      throw new Error('Não foi possível calcular previsão');
    }

    const forecast = forecastResult.data;
    
    // Buscar salários fixos do mês
    const salariesResult = await getFixedIncomeByMonth(userId, year, month);
    if (salariesResult.error) {
      throw new Error('Erro ao buscar salários');
    }

    const salaries = salariesResult.data?.filter((income: any) => income.tipo === 'salario') || [];
    const availableSalary = salaries.reduce((sum: number, salary: any) => sum + salary.valor, 0);

    const needsSalary = forecast.saldo_previsto_final < 0;
    const shortage = needsSalary ? Math.abs(forecast.saldo_previsto_final) : 0;

    return { 
      data: { 
        needsSalary, 
        shortage, 
        availableSalary 
      }, 
      error: null 
    };
  } catch (error: any) {
    console.error('Erro ao calcular necessidade de salário:', error);
    return { data: null, error: error.message };
  }
}
