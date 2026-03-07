// ============================================
// FINACO - Serviços de Análises Financeiras (Modo Local)
// Wrapper que detecta modo local vs Supabase
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import { localDB } from '@/lib/local-storage';
import type {
  FinancialSummary,
  CategorySummary,
  MonthlyTrend,
  FinancialScore,
  WeekdayExpense,
  DailyExpense,
  Transaction,
} from '@/types';
import { getMonthRange } from '@/lib/utils';

const isLocalMode = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321');
};

/**
 * Calcula o resumo financeiro do mês
 */
export async function getFinancialSummary(
  userId: string,
  month: Date
): Promise<FinancialSummary> {
  const { start, end } = getMonthRange(month);

  let transactions: Transaction[] = [];

  if (isLocalMode()) {
    transactions = localDB.getTransactions().filter(t => {
      const tDate = new Date(t.data_transacao);
      return tDate >= start && tDate <= end;
    });
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('data_transacao', start.toISOString().split('T')[0])
      .lte('data_transacao', end.toISOString().split('T')[0]);
    transactions = data || [];
  }

  if (!transactions.length) {
    return {
      receita_total: 0,
      despesa_total: 0,
      saldo: 0,
      economia_percentual: 0,
      contas_vencidas: 0,
      contas_pendentes: 0,
    };
  }

  const receita_total = transactions
    .filter((t) => t.tipo === 'receita')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const despesa_total = transactions
    .filter((t) => t.tipo === 'despesa')
    .reduce((sum, t) => sum + Number(t.valor), 0);

  const saldo = receita_total - despesa_total;

  const economia_percentual =
    receita_total > 0 ? ((saldo / receita_total) * 100) : 0;

  const contas_vencidas = transactions.filter((t) => t.status === 'vencido').length;

  const contas_pendentes = transactions.filter(
    (t) => t.status === 'andamento'
  ).length;

  return {
    receita_total,
    despesa_total,
    saldo,
    economia_percentual,
    contas_vencidas,
    contas_pendentes,
  };
}

/**
 * Calcula gastos por categoria
 */
export async function getCategoryExpenses(
  userId: string,
  month: Date,
  tipo: 'receita' | 'despesa'
): Promise<CategorySummary[]> {
  const { start, end } = getMonthRange(month);

  let transactions: any[] = [];

  if (isLocalMode()) {
    const allTransactions = localDB.getTransactions();
    const categories = localDB.getCategories();
    
    transactions = allTransactions
      .filter(t => {
        const tDate = new Date(t.data_transacao);
        return t.tipo === tipo && tDate >= start && tDate <= end;
      })
      .map(t => ({
        ...t,
        categoria: categories.find(c => c.id === t.categoria_id),
      }));
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*, categoria:categories(*)')
      .eq('user_id', userId)
      .eq('tipo', tipo)
      .gte('data_transacao', start.toISOString().split('T')[0])
      .lte('data_transacao', end.toISOString().split('T')[0]);
    transactions = data || [];
  }

  if (!transactions.length) return [];

  // Agrupar por categoria
  const categoryMap = new Map<string, CategorySummary>();

  transactions.forEach((t: any) => {
    const catId = t.categoria_id || 'sem-categoria';
    const catName = t.categoria?.nome || 'Sem Categoria';
    const catColor = t.categoria?.cor || '#64748B';

    if (categoryMap.has(catId)) {
      const existing = categoryMap.get(catId)!;
      existing.total += Number(t.valor);
      existing.quantidade += 1;
    } else {
      categoryMap.set(catId, {
        categoria_id: catId,
        categoria_nome: catName,
        categoria_cor: catColor,
        total: Number(t.valor),
        percentual: 0,
        quantidade: 1,
      });
    }
  });

  const result = Array.from(categoryMap.values());
  const total = result.reduce((sum, c) => sum + c.total, 0);

  // Calcular percentuais
  result.forEach((c) => {
    c.percentual = total > 0 ? Math.round((c.total / total) * 100) : 0;
  });

  return result.sort((a, b) => b.total - a.total);
}

/**
 * Calcula gastos por dia do mês
 */
export async function getDailyExpenses(
  userId: string,
  month: Date
): Promise<DailyExpense[]> {
  const { start, end } = getMonthRange(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  let transactions: Transaction[] = [];

  if (isLocalMode()) {
    transactions = localDB.getTransactions().filter(t => {
      const tDate = new Date(t.data_transacao);
      return t.tipo === 'despesa' && tDate >= start && tDate <= end;
    });
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', 'despesa')
      .gte('data_transacao', start.toISOString().split('T')[0])
      .lte('data_transacao', end.toISOString().split('T')[0]);
    transactions = data || [];
  }

  // Criar mapa de dias do mês
  const dailyMap = new Map<number, number>();
  
  transactions.forEach((t: Transaction) => {
    const date = new Date(t.data_transacao);
    const dayNumber = date.getDate();
    console.log('📊 Contabilizando transação no dia:', dayNumber, '| Data:', t.data_transacao, '| Descrição:', t.descricao.substring(0, 30));
    dailyMap.set(dayNumber, (dailyMap.get(dayNumber) || 0) + Number(t.valor));
  });

  // Criar array com todos os dias do mês
  const result: DailyExpense[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    result.push({
      dia: String(day).padStart(2, '0'),
      total: dailyMap.get(day) || 0,
      quantidade: 0 // pode calcular quantidade se necessário
    });
  }

  return result;
}

/**
 * Calcula gastos por dia da semana
 */
export async function getWeekdayExpenses(
  userId: string,
  month: Date
): Promise<WeekdayExpense[]> {
  const { start, end } = getMonthRange(month);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  let transactions: Transaction[] = [];

  if (isLocalMode()) {
    transactions = localDB.getTransactions().filter(t => {
      const tDate = new Date(t.data_transacao);
      return t.tipo === 'despesa' && tDate >= start && tDate <= end;
    });
  } else {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', 'despesa')
      .gte('data_transacao', start.toISOString().split('T')[0])
      .lte('data_transacao', end.toISOString().split('T')[0]);
    transactions = data || [];
  }

  if (!transactions.length) {
    return weekdays.map((dia, index) => ({
      dia_semana: dia,
      dia_numero: index,
      total: 0,
      media: 0,
    }));
  }

  const weekdayMap = new Map<number, { total: number; count: number }>();

  transactions.forEach((t: Transaction) => {
    const date = new Date(t.data_transacao);
    const dayNumber = date.getDay();

    if (weekdayMap.has(dayNumber)) {
      const existing = weekdayMap.get(dayNumber)!;
      existing.total += Number(t.valor);
      existing.count += 1;
    } else {
      weekdayMap.set(dayNumber, {
        total: Number(t.valor),
        count: 1,
      });
    }
  });

  const result: WeekdayExpense[] = [];
  for (let i = 0; i < 7; i++) {
    if (weekdayMap.has(i)) {
      const data = weekdayMap.get(i)!;
      result.push({
        dia_semana: weekdays[i],
        dia_numero: i,
        total: data.total,
        media: data.count > 0 ? data.total / data.count : 0,
      });
    } else {
      result.push({
        dia_semana: weekdays[i],
        dia_numero: i,
        total: 0,
        media: 0,
      });
    }
  }

  return result;
}

/**
 * Calcula tendência mensal (últimos 6 meses)
 */
export async function getMonthlyTrend(userId: string): Promise<MonthlyTrend[]> {
  const result: MonthlyTrend[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = getMonthRange(month);

    let transactions: Transaction[] = [];

    if (isLocalMode()) {
      transactions = localDB.getTransactions().filter(t => {
        const tDate = new Date(t.data_transacao);
        return tDate >= start && tDate <= end;
      });
    } else {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('data_transacao', start.toISOString().split('T')[0])
        .lte('data_transacao', end.toISOString().split('T')[0]);
      transactions = data || [];
    }

    const receita = transactions
      .filter((t) => t.tipo === 'receita')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    const despesa = transactions
      .filter((t) => t.tipo === 'despesa')
      .reduce((sum, t) => sum + Number(t.valor), 0);

    result.push({
      mes: month.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      ano: month.getFullYear(),
      receita,
      despesa,
      saldo: receita - despesa,
    });
  }

  return result;
}

/**
 * Calcula score de saúde financeira
 */
export async function calculateFinancialScore(
  userId: string,
  month: Date
): Promise<FinancialScore> {
  const summary = await getFinancialSummary(userId, month);

  // Se não há transações, retornar score 0 com mensagem especial
  if (summary.receita_total === 0 && summary.despesa_total === 0) {
    return {
      score: 0,
      nivel: 'risco',
      mensagem: 'Adicione transações para calcular sua saúde financeira.',
      fatores: {
        saldo_positivo: false,
        economia_adequada: false,
        sem_vencidos: false,
        tendencia_positiva: false,
      },
    };
  }

  let score = 0;
  
  // Fator 1: Saldo positivo (25 pontos)
  const saldo_positivo = summary.saldo > 0;
  if (saldo_positivo) score += 25;

  // Fator 2: Taxa de economia adequada - pelo menos 20% (25 pontos)
  const economia_adequada = summary.economia_percentual >= 20;
  if (economia_adequada) score += 25;

  // Fator 3: Sem contas vencidas (25 pontos)
  const sem_vencidos = summary.contas_vencidas === 0;
  if (sem_vencidos) score += 25;

  // Fator 4: Tendência positiva - comparar com mês anterior (25 pontos)
  const trend = await getMonthlyTrend(userId);
  let tendencia_positiva = false;
  if (trend.length >= 2) {
    const mesAtual = trend[trend.length - 1];
    const mesAnterior = trend[trend.length - 2];
    tendencia_positiva = mesAtual.saldo > mesAnterior.saldo;
  }
  if (tendencia_positiva) score += 25;

  // Determinar nível e mensagem
  let nivel: FinancialScore['nivel'];
  let mensagem: string;
  
  if (score >= 80) {
    nivel = 'excelente';
    mensagem = 'Sua saúde financeira está excelente! Continue assim.';
  } else if (score >= 60) {
    nivel = 'bom';
    mensagem = 'Sua saúde financeira está boa, mas há espaço para melhorias.';
  } else if (score >= 40) {
    nivel = 'atencao';
    mensagem = 'Atenção! Sua saúde financeira precisa de cuidados.';
  } else {
    nivel = 'risco';
    mensagem = 'Sua saúde financeira está em risco. Tome medidas urgentes.';
  }

  return {
    score,
    nivel,
    mensagem,
    fatores: {
      saldo_positivo,
      economia_adequada,
      sem_vencidos,
      tendencia_positiva,
    },
  };
}

/**
 * Gera insights automáticos
 */
export async function generateInsights(userId: string, month: Date) {
  // Para modo local, apenas retornamos um array vazio
  // A lógica completa de insights pode ser implementada depois
  return { data: [], error: null };
}
