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
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AIChatBot } from '@/components/ai-chatbot';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Calendar,
  Loader2,
  CreditCard,
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
      if (transaction.forma_pagamento) {
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
      } else {
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

      setLoading(false);
    }

    loadData();
  }, [user, selectedMonth, viewMode, healthThreshold]);

  if (loading || !summary || !financialScore || !monthlyForecast) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Componente de ícone para cartões
  const CardIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'nubank':
        return (
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">NU</span>
          </div>
        );
      case 'santander':
        return (
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
        );
    }
  };

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

      {/* Dashboard por Cartões */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo por Cartões</CardTitle>
          <CardDescription>
            Movimentações por forma de pagamento em {viewMode === 'yearly' 
              ? `${selectedMonth.getFullYear()}` 
              : `${getMonthName(selectedMonth)} de ${selectedMonth.getFullYear()}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cardData.length > 0 ? (
              cardData.map((card, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CardIcon type={card.type} />
                    <div>
                      <h3 className="font-medium">{card.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {card.count} transações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        card.total >= 0 ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {formatCurrency(card.total)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma movimentação por cartão encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score Financeiro Personalizado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`flex items-center gap-2 ${
                (financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 
                  ? 'text-danger' 
                  : ''
              }`}>
                Saúde Financeira
                {(financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 && (
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                )}
              </CardTitle>
              <CardDescription className={`${
                (financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 
                  ? 'text-danger font-medium' 
                  : ''
              }`}>
                {financialScore.mensagem}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="threshold" className="text-sm">Meta de economia:</Label>
              <select
                id="threshold"
                value={healthThreshold}
                onChange={(e) => setHealthThreshold(parseInt(e.target.value))}
                className="px-2 py-1 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value={10}>10%</option>
                <option value={20}>20%</option>
                <option value={30}>30%</option>
                <option value={40}>40%</option>
                <option value={50}>50%</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Visual Circular */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center">
                  <div 
                    className={`absolute inset-0 rounded-full border-8 transition-all ${
                      (financialScore as any).status === 'excelente' ? 'border-success border-t-transparent border-r-transparent' :
                      (financialScore as any).status === 'bom' ? 'border-primary border-t-transparent border-r-transparent' :
                      (financialScore as any).status === 'alerta' ? 'border-warning border-t-transparent border-r-transparent' :
                      'border-danger border-t-transparent border-r-transparent animate-pulse'
                    }`}
                    style={{
                      transform: `rotate(${(financialScore.score / 100) * 360 - 90}deg)`,
                    }}
                  />
                  <div className="relative z-10 text-center">
                    <div className={`text-2xl font-bold ${
                      (financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 
                        ? 'text-danger animate-pulse' 
                        : ''
                    }`}>
                      {financialScore.score}
                    </div>
                    <div className="text-xs text-muted-foreground">pontos</div>
                  </div>
                </div>
                {/* Indicador de criticidade extra */}
                {(financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-danger rounded-full flex items-center justify-center animate-bounce">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Status e Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`text-center p-4 border rounded-lg ${
                (financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 
                  ? 'border-danger bg-danger/10 animate-pulse' 
                  : ''
              }`}>
                <div className={`text-lg font-semibold ${
                  (financialScore as any).status === 'excelente' ? 'text-success' :
                  (financialScore as any).status === 'bom' ? 'text-primary' :
                  (financialScore as any).status === 'alerta' ? 'text-warning' :
                  'text-danger'
                }`}>
                  {(financialScore as any).status.charAt(0).toUpperCase() + (financialScore as any).status.slice(1)}
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
                {(financialScore as any).status === 'crítico' && (financialScore as any).percentualEconomia <= 0 && (
                  <div className="mt-2 text-xs text-danger font-medium">
                    ⚠️ Economia ZERO
                  </div>
                )}
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-semibold">
                  {(financialScore as any).percentualEconomia?.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Economia Atual</div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-semibold">
                  {healthThreshold}%
                </div>
                <div className="text-sm text-muted-foreground">Sua Meta</div>
              </div>
            </div>

            {/* Indicadores */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso para meta</span>
                <span className="font-medium">
                  {Math.min(100, ((financialScore as any).percentualEconomia / healthThreshold) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previsão Mensal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={`flex items-center gap-2 ${
                monthlyForecast.status === 'critico' ? 'text-danger' :
                monthlyForecast.status === 'alerta' ? 'text-warning' :
                'text-success'
              }`}>
                Previsão do Mês
                {monthlyForecast.status === 'critico' && (
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                )}
              </CardTitle>
              <CardDescription>
                {monthlyForecast.mes_nome} de {monthlyForecast.ano} - {monthlyForecast.dias_restantes} dias restantes
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                monthlyForecast.saldo_previsto_final >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {formatCurrency(monthlyForecast.saldo_previsto_final)}
              </div>
              <div className="text-sm text-muted-foreground">Saldo previsto</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Alertas */}
            {forecastAlerts.length > 0 && (
              <div className="space-y-2">
                {forecastAlerts.slice(0, 3).map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      alert.nivel === 'critico' ? 'border-danger bg-danger/10 text-danger' :
                      alert.nivel === 'alerta' ? 'border-warning bg-warning/10 text-warning' :
                      'border-primary bg-primary/10 text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{alert.mensagem}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-lg font-semibold text-success">
                  {formatCurrency(monthlyForecast.receitas_realizadas + monthlyForecast.receitas_previstas)}
                </div>
                <div className="text-xs text-muted-foreground">Total Receitas</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-lg font-semibold text-danger">
                  {formatCurrency(monthlyForecast.despesas_realizadas + monthlyForecast.despesas_previstas)}
                </div>
                <div className="text-xs text-muted-foreground">Total Despesas</div>
              </div>
            </div>

            {/* Progresso do Mês */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso do mês</span>
                <span className="font-medium">
                  {Math.round(((30 - monthlyForecast.dias_restantes) / 30) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    monthlyForecast.status === 'critico' ? 'bg-danger' :
                    monthlyForecast.status === 'alerta' ? 'bg-warning' :
                    'bg-success'
                  }`}
                  style={{ width: `${((30 - monthlyForecast.dias_restantes) / 30) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="weekdays">Por Dia do Mês</TabsTrigger>
          <TabsTrigger value="trend">Tendência</TabsTrigger>
        </TabsList>

        {/* Gráfico: Gastos por Categoria */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryExpenses}
                    dataKey="total"
                    nameKey="categoria_nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.categoria_nome}: ${entry.percentual}%`}
                  >
                    {categoryExpenses.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.categoria_cor || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gráfico: Gastos por Dia do Mês */}
        <TabsContent value="weekdays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Dia do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="total" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gráfico: Tendência Mensal */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendência dos Últimos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10B981"
                    name="Receita"
                  />
                  <Line
                    type="monotone"
                    dataKey="despesa"
                    stroke="#EF4444"
                    name="Despesa"
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#3B82F6"
                    name="Saldo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* ChatBot IA */}
      <AIChatBot />
    </div>
  );
}
