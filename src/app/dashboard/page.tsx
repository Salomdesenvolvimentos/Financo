// ============================================
// Página: Dashboard
// Página principal com indicadores e gráficos
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getFinancialSummary,
  getCategoryExpenses,
  getDailyExpenses,
  getMonthlyTrend,
  calculateFinancialScore,
} from '@/services/analytics.local';
import { getTransactions } from '@/services/transactions.local';
import { calculateMonthlyForecast, generateForecastAlerts } from '@/services/forecast.local';
import type {
  FinancialSummary,
  CategorySummary,
  DailyExpense,
  MonthlyTrend,
  FinancialScore,
  MonthlyForecast,
  ForecastAlert,
} from '@/types';
import { formatCurrency, getMonthName } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Trophy,
  TriangleAlert,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<CategorySummary[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [financialScore, setFinancialScore] = useState<FinancialScore | null>(null);
  const [cardData, setCardData] = useState<any[]>([]);
  const [healthThreshold, setHealthThreshold] = useState(30); // Percentual padrão 30%
  const [monthlyForecast, setMonthlyForecast] = useState<MonthlyForecast | null>(null);
  const [forecastAlerts, setForecastAlerts] = useState<ForecastAlert[]>([]);
  // Independent forecast month (can be current or up to 6 months ahead)
  const [forecastMonth, setForecastMonth] = useState(new Date());
  const [forecastLoading, setForecastLoading] = useState(false);

  // Simulator "e se...?"
  const [simExtraExpense, setSimExtraExpense] = useState(0);

  // Anomaly detection
  const [anomalies, setAnomalies] = useState<{ categoria: string; media: number; atual: number; delta: number }[]>([]);


  // Função para buscar dados por cartão
  const getCardData = async (userId: string, month: Date) => {
    const monthFilter = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    console.log('Buscando dados do cartão para:', monthFilter);
    
    const { data: transactions } = await getTransactions({
      mes: monthFilter
    });

    console.log('Transações encontradas:', transactions?.length || 0);
    if (transactions) {
      console.log('Transações com forma_pagamento:', transactions.filter(t => t.forma_pagamento));
    }

    if (!transactions) return [];

    const cardMap = new Map();
    
    transactions.forEach(transaction => {
      // Faturas de cartão são excluídas do total por cartão para evitar dupla contagem
      if (transaction.forma_pagamento && !transaction.is_fatura) {
        const card = transaction.forma_pagamento;
        console.log('Processando cartão:', card, 'valor:', transaction.valor);
        
        if (!cardMap.has(card)) {
          cardMap.set(card, {
            name: card,
            total: 0,
            count: 0,
            type: card.toLowerCase().includes('nubank') ? 'nubank' : 
                  card.toLowerCase().includes('santander') ? 'santander' : 'default'
          });
        }
        const cardData = cardMap.get(card);
        cardData.total += transaction.tipo === 'despesa' ? -Math.abs(transaction.valor) : Math.abs(transaction.valor);
        cardData.count += 1;
      }
    });

    const result = Array.from(cardMap.values());
    console.log('Resultado final dos cartões:', result);
    return result;
  };

  // Função para buscar dados anuais
  const getYearlyData = async (userId: string, year: number) => {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    const { data: transactions } = await getTransactions({
      data_inicio: yearStart,
      data_fim: yearEnd
    });

    if (!transactions) return null;

    const yearlySummary = {
      total_receitas: 0,
      total_despesas: 0,
      saldo: 0,
      contas_vencidas: 0,
      contas_pendentes: 0,
      economia_mensal: 0,
      economia_percentual: 0,
    };

    transactions.forEach(transaction => {
      if (transaction.tipo === 'receita') {
        yearlySummary.total_receitas += Math.abs(transaction.valor);
      } else if (transaction.tipo === 'despesa' && !transaction.is_fatura) {
        // Excluir faturas de cartão para evitar dupla contagem
        yearlySummary.total_despesas += Math.abs(transaction.valor);
      }
    });

    yearlySummary.saldo = yearlySummary.total_receitas - yearlySummary.total_despesas;
    yearlySummary.economia_mensal = yearlySummary.saldo / 12;
    yearlySummary.economia_percentual = yearlySummary.total_receitas > 0 
      ? ((yearlySummary.total_receitas - yearlySummary.total_despesas) / yearlySummary.total_receitas) * 100 
      : 0;

    return yearlySummary;
  };

  // Função para calcular saúde financeira personalizada
  const calculateCustomHealthScore = (summary: any, threshold: number) => {
    if (!summary) return null;

    // Correção: usar receita_total e despesa_total em vez de total_receitas
    const percentualEconomia = summary.receita_total > 0 
      ? ((summary.receita_total - summary.despesa_total) / summary.receita_total) * 100 
      : 0;

    // Debug log para verificar cálculo
    console.log('Debug Saúde Financeira:', {
      receita_total: summary.receita_total,
      despesa_total: summary.despesa_total,
      saldo: summary.saldo,
      percentualEconomia,
      threshold
    });

    let score = 0;
    let status = 'crítico';
    let mensagem = '';

    // Casos especiais para economia zero ou negativa
    if (percentualEconomia <= 0) {
      score = 0;
      status = 'crítico';
      mensagem = `Situação crítica! Você não está economizando e está gastando tudo o que recebe (ou mais). É necessário revisar urgentemente suas finanças.`;
    } else if (percentualEconomia >= threshold) {
      score = Math.min(100, (percentualEconomia / threshold) * 100);
      status = 'excelente';
      mensagem = `Parabéns! Você está economizando ${percentualEconomia.toFixed(1)}%, acima da sua meta de ${threshold}%!`;
    } else if (percentualEconomia >= threshold * 0.7) {
      score = (percentualEconomia / threshold) * 100;
      status = 'bom';
      mensagem = `Você está economizando ${percentualEconomia.toFixed(1)}%. Faltam ${(threshold - percentualEconomia).toFixed(1)}% para atingir sua meta.`;
    } else if (percentualEconomia >= threshold * 0.4) {
      score = (percentualEconomia / threshold) * 100;
      status = 'alerta';
      mensagem = `Atenção! Você está economizando apenas ${percentualEconomia.toFixed(1)}%. Considere reduzir despesas.`;
    } else {
      score = Math.max(0, (percentualEconomia / threshold) * 50);
      status = 'crítico';
      mensagem = `Situação crítica! Você está economizando apenas ${percentualEconomia.toFixed(1)}%. É necessário revisar urgentemente suas finanças.`;
    }

    return {
      score: Math.round(score),
      status,
      mensagem,
      percentualEconomia,
      threshold
    };
  };

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      let summaryData;
      let cardsData;
      let categoriesData: CategorySummary[] = [];
      let dailyData: DailyExpense[] = [];
      let trendData: MonthlyTrend[] = [];

      if (viewMode === 'yearly') {
        // Carregar dados anuais
        const yearlyData = await getYearlyData(user?.id || '', selectedMonth.getFullYear());
        // Converter para formato compatível
        summaryData = yearlyData ? {
          receita_total: yearlyData.total_receitas,
          despesa_total: yearlyData.total_despesas,
          saldo: yearlyData.saldo,
          contas_vencidas: yearlyData.contas_vencidas,
          contas_pendentes: yearlyData.contas_pendentes,
        } as FinancialSummary : null;
        // Para dados de cartões, usar o mês selecionado
        cardsData = await getCardData(user?.id || '', selectedMonth);
      } else {
        // Carregar dados mensais
        [summaryData, categoriesData, dailyData, trendData, , cardsData] =
          await Promise.all([
            getFinancialSummary(user?.id || '', selectedMonth),
            getCategoryExpenses(user?.id || '', selectedMonth, 'despesa'),
            getDailyExpenses(user?.id || '', selectedMonth),
            getMonthlyTrend(user?.id || ''),
            calculateFinancialScore(user?.id || '', selectedMonth),
            getCardData(user?.id || '', selectedMonth),
          ]);
        setCategoryExpenses(categoriesData);
        setDailyExpenses(dailyData);
        setMonthlyTrend(trendData);
      }

      // Calcular saúde financeira personalizada
      const customScore = calculateCustomHealthScore(summaryData, healthThreshold);

      // Carregar previsão mensal
      const forecastResult = await calculateMonthlyForecast(user?.id || '', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
      const alertsResult = await generateForecastAlerts(user?.id || '', selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);

      setSummary(summaryData);
      setCardData(cardsData);
      setFinancialScore(customScore as any);
      setMonthlyForecast(forecastResult.data);
      setForecastAlerts(alertsResult.data || []);

      // Detecção de anomalias: categorias com gasto atual > 30% acima da média histórica
      if (categoriesData.length > 0 && trendData.length >= 2) {
        const detectedAnomalies: { categoria: string; media: number; atual: number; delta: number }[] = [];
        // Build average spending per category from trend months (we use categoryExpenses as current month)
        // Simple heuristic: flag any category whose total exceeds 1.3x the average across monthlyTrend despesa proportion
        const avgMonthlyExpense = trendData.reduce((acc, m) => acc + m.despesa, 0) / trendData.length;
        if (avgMonthlyExpense > 0) {
          categoriesData.forEach(cat => {
            // Estimate expected share: use category's share from previous month in trend
            const catShare = cat.total / (summaryData?.despesa_total || 1);
            const expectedForCat = avgMonthlyExpense * catShare;
            // Flag if current month is >40% above what trend average implies
            const expectedAvg = avgMonthlyExpense * catShare;
            if (expectedAvg > 0 && cat.total > expectedAvg * 1.4) {
              detectedAnomalies.push({
                categoria: cat.categoria_nome,
                media: Math.round(expectedAvg),
                atual: Math.round(cat.total),
                delta: Math.round(((cat.total - expectedAvg) / expectedAvg) * 100),
              });
            }
          });
        }
        setAnomalies(detectedAnomalies.slice(0, 3));
      }

      setLoading(false);
    }

    loadData();
  }, [user, selectedMonth, viewMode, healthThreshold]);

  // Reload forecast independently when forecastMonth changes
  useEffect(() => {
    if (!user) return;
    setForecastLoading(true);
    Promise.all([
      calculateMonthlyForecast(user.id, forecastMonth.getFullYear(), forecastMonth.getMonth() + 1),
      generateForecastAlerts(user.id, forecastMonth.getFullYear(), forecastMonth.getMonth() + 1),
    ]).then(([fRes, aRes]) => {
      setMonthlyForecast(fRes.data);
      setForecastAlerts(aRes.data || []);
      setForecastLoading(false);
    });
  }, [user, forecastMonth]);

  if (loading || !summary || !financialScore || !monthlyForecast) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Cores para os gráficos
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {viewMode === 'yearly' 
              ? `Visão anual de ${selectedMonth.getFullYear()}` 
              : `Visão de ${getMonthName(selectedMonth)} de ${selectedMonth.getFullYear()}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Controles de Visualização */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('monthly')}
            >
              Mensal
            </Button>
            <Button
              variant={viewMode === 'yearly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('yearly')}
            >
              Anual
            </Button>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            {viewMode === 'monthly' ? (
              <>
                <select
                  value={selectedMonth.getFullYear()}
                  onChange={(e) => {
                    const year = parseInt(e.target.value);
                    setSelectedMonth(new Date(year, selectedMonth.getMonth(), 1));
                  }}
                  className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={selectedMonth.getMonth()}
                  onChange={(e) => {
                    const month = parseInt(e.target.value);
                    setSelectedMonth(new Date(selectedMonth.getFullYear(), month, 1));
                  }}
                  className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value={0}>Janeiro</option>
                  <option value={1}>Fevereiro</option>
                  <option value={2}>Março</option>
                  <option value={3}>Abril</option>
                  <option value={4}>Maio</option>
                  <option value={5}>Junho</option>
                  <option value={6}>Julho</option>
                  <option value={7}>Agosto</option>
                  <option value={8}>Setembro</option>
                  <option value={9}>Outubro</option>
                  <option value={10}>Novembro</option>
                  <option value={11}>Dezembro</option>
                </select>
              </>
            ) : (
              <select
                value={selectedMonth.getFullYear()}
                onChange={(e) => {
                  const year = parseInt(e.target.value);
                  setSelectedMonth(new Date(year, 0, 1));
                }}
                className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Indicadores Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Receita Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(summary.receita_total)}
            </div>
          </CardContent>
        </Card>

        {/* Despesa Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">
              {formatCurrency(summary.despesa_total)}
            </div>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.saldo >= 0 ? 'text-success' : 'text-danger'
              }`}
            >
              {formatCurrency(summary.saldo)}
            </div>
            <p className="text-muted-foreground">
              Economia: {((summary as any).economia_percentual || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Contas Vencidas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.contas_vencidas}</div>
            <p className="text-xs text-muted-foreground">
              {summary.contas_pendentes} pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Saúde Financeira + Previsão lado a lado */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Saúde Financeira */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-base flex items-center gap-2 ${
                (financialScore as any).status === 'crítico' ? 'text-danger' : ''
              }`}>
                Saúde Financeira
                {(financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 && (
                  <AlertCircle className="h-4 w-4 animate-pulse" />
                )}
              </CardTitle>
              <select
                value={healthThreshold}
                onChange={(e) => setHealthThreshold(parseInt(e.target.value))}
                className="px-2 py-1 border border-input bg-background text-foreground rounded text-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value={10}>Meta 10%</option>
                <option value={20}>Meta 20%</option>
                <option value={30}>Meta 30%</option>
                <option value={40}>Meta 40%</option>
                <option value={50}>Meta 50%</option>
              </select>
            </div>
            <CardDescription className={`${
              (financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0
                ? 'text-danger font-medium'
                : ''
            }`}>
              {financialScore.mensagem}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <div className="w-20 h-20 rounded-full border-6 border-muted flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full border-6 transition-all ${
                      (financialScore as any).status === 'excelente' ? 'border-success border-t-transparent border-r-transparent' :
                      (financialScore as any).status === 'bom' ? 'border-primary border-t-transparent border-r-transparent' :
                      (financialScore as any).status === 'alerta' ? 'border-warning border-t-transparent border-r-transparent' :
                      'border-danger border-t-transparent border-r-transparent animate-pulse'
                    }`}
                    style={{ transform: `rotate(${(financialScore.score / 100) * 360 - 90}deg)` }}
                  />
                  <div className="relative z-10 text-center">
                    <div className={`text-xl font-bold ${
                      (financialScore as any).status === 'crítico' ? 'text-danger' : ''
                    }`}>{financialScore.score}</div>
                    <div className="text-[10px] text-muted-foreground">pts</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`font-medium capitalize ${
                    (financialScore as any).status === 'excelente' ? 'text-success' :
                    (financialScore as any).status === 'bom' ? 'text-primary' :
                    (financialScore as any).status === 'alerta' ? 'text-warning' :
                    'text-danger'
                  }`}>{(financialScore as any).status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Economia</span>
                  <span className="font-medium">{(financialScore as any).percentualEconomia?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-medium">{healthThreshold}%</span>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        (financialScore as any).status === 'excelente' ? 'bg-success' :
                        (financialScore as any).status === 'bom' ? 'bg-primary' :
                        (financialScore as any).status === 'alerta' ? 'bg-warning' :
                        'bg-danger'
                      }`}
                      style={{ width: `${Math.min(100, ((financialScore as any).percentualEconomia / healthThreshold) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-muted-foreground">
                    {Math.min(100, ((financialScore as any).percentualEconomia / healthThreshold) * 100).toFixed(0)}% da meta
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previsão do Mês */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={`text-base ${
                monthlyForecast.status === 'critico' ? 'text-danger' :
                monthlyForecast.status === 'alerta' ? 'text-warning' : ''
              }`}>
                Previsão Financeira
              </CardTitle>
              <div className={`text-xl font-bold ${
                monthlyForecast.saldo_previsto_final >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {formatCurrency(monthlyForecast.saldo_previsto_final)}
              </div>
            </div>
            {/* Month navigation */}
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const prev = new Date(forecastMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  // Don't go more than 12 months in the past
                  const minDate = new Date();
                  minDate.setMonth(minDate.getMonth() - 12);
                  if (prev >= minDate) setForecastMonth(prev);
                }}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <CardDescription className="flex-1 text-center text-xs">
                {forecastLoading ? (
                  <span className="animate-pulse">Carregando...</span>
                ) : (
                  <>
                    {monthlyForecast.mes_nome} {monthlyForecast.ano}
                    {forecastMonth.getMonth() !== new Date().getMonth() ||
                    forecastMonth.getFullYear() !== new Date().getFullYear() ? (
                      <span className="ml-1 text-primary font-medium">(projeção)</span>
                    ) : (
                      <span className="ml-1">· {monthlyForecast.dias_restantes} dias restantes</span>
                    )}
                  </>
                )}
              </CardDescription>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  const next = new Date(forecastMonth);
                  next.setMonth(next.getMonth() + 1);
                  // Limit to 6 months in the future
                  const maxDate = new Date();
                  maxDate.setMonth(maxDate.getMonth() + 6);
                  if (next <= maxDate) setForecastMonth(next);
                }}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className={`space-y-3 ${forecastLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg text-center">
                <div className="text-base font-semibold text-success">
                  {formatCurrency(monthlyForecast.receitas_realizadas + monthlyForecast.receitas_previstas)}
                </div>
                <div className="text-xs text-muted-foreground">Receitas</div>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <div className="text-base font-semibold text-danger">
                  {formatCurrency(monthlyForecast.despesas_realizadas + monthlyForecast.despesas_previstas)}
                </div>
                <div className="text-xs text-muted-foreground">Despesas (+ fixas)</div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso do mês</span>
                <span>{Math.round(((30 - monthlyForecast.dias_restantes) / 30) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    monthlyForecast.status === 'critico' ? 'bg-danger' :
                    monthlyForecast.status === 'alerta' ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(100, ((30 - monthlyForecast.dias_restantes) / 30) * 100)}%` }}
                />
              </div>
            </div>
            {forecastAlerts.slice(0, 2).map((alert, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg border text-xs flex items-start gap-2 ${
                  alert.nivel === 'critico' ? 'border-danger/30 bg-danger/10 text-danger' :
                  alert.nivel === 'alerta' ? 'border-warning/30 bg-warning/10 text-warning' :
                  'border-primary/30 bg-primary/10 text-primary'
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{alert.mensagem}</span>
              </div>
            ))}

            {/* Simulador E se...? */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                Simulador — e se eu gastar mais este mês?
              </p>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(500, Math.round((monthlyForecast.receitas_realizadas + monthlyForecast.receitas_previstas) * 0.5))}
                  step={50}
                  value={simExtraExpense}
                  onChange={(e) => setSimExtraExpense(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs font-semibold w-20 text-right">
                  {formatCurrency(simExtraExpense)}
                </span>
              </div>
              {(() => {
                const baseReceita = monthlyForecast.receitas_realizadas + monthlyForecast.receitas_previstas;
                const baseDespesa = monthlyForecast.despesas_realizadas + monthlyForecast.despesas_previstas;
                const simDespesa = baseDespesa + simExtraExpense;
                const simSaldo = baseReceita - simDespesa;
                const simEco = baseReceita > 0 ? (simSaldo / baseReceita) * 100 : 0;
                const simScore = calculateCustomHealthScore(
                  { receita_total: baseReceita, despesa_total: simDespesa, saldo: simSaldo },
                  healthThreshold
                );
                const scoreDiff = simScore ? simScore.score - financialScore.score : 0;
                return (
                  <div className="rounded-lg border p-2.5 space-y-1.5 bg-muted/30 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Despesa total (c/ fixas)</span>
                      <span className="font-medium text-danger">{formatCurrency(simDespesa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saldo previsto</span>
                      <span className={`font-medium ${simSaldo >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(simSaldo)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Saúde financeira</span>
                      <span className={`font-medium ${scoreDiff < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                        {simScore?.score ?? financialScore.score} pts
                        {scoreDiff !== 0 && (
                          <span className="ml-1">({scoreDiff > 0 ? '+' : ''}{scoreDiff})</span>
                        )}
                      </span>
                    </div>
                    {simScore && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            simScore.status === 'excelente' ? 'bg-success' :
                            simScore.status === 'bom' ? 'bg-primary' :
                            simScore.status === 'alerta' ? 'bg-warning' : 'bg-danger'
                          }`}
                          style={{ width: `${Math.min(100, (simEco / healthThreshold) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Categorias + Tendência lado a lado */}
      <div className="grid gap-4 md:grid-cols-5">
        {/* Pie: Despesas por categoria */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryExpenses.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sem dados para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    dataKey="total"
                    nameKey="categoria_nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.percentual}%`}
                    labelLine={false}
                  >
                    {categoryExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.categoria_cor || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Line: Tendência 6 meses */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendência — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sem dados suficientes
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  <Line type="monotone" dataKey="receita" stroke="#10B981" name="Receita" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="despesa" stroke="#EF4444" name="Despesa" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="saldo" stroke="#3B82F6" name="Saldo" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar: Gastos diários */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gastos por Dia do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyExpenses.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Sem dados para o período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" fill="#3B82F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detecção de Anomalias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-warning" />
              Detecção de Anomalias
            </CardTitle>
            <CardDescription>
              Categorias com gasto acima do esperado em relação aos últimos meses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {anomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-2 text-muted-foreground">
                <Trophy className="h-8 w-8 text-success opacity-70" />
                <p className="text-sm">Nenhuma anomalia detectada. Continue assim!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anomalies.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 border border-warning/30 bg-warning/5 rounded-lg">
                    <TriangleAlert className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.categoria}</p>
                      <p className="text-xs text-muted-foreground">
                        Média histórica: {formatCurrency(a.media)} · Atual: {formatCurrency(a.atual)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-warning whitespace-nowrap">
                      +{a.delta}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
      </Card>
    </div>
  );
}
