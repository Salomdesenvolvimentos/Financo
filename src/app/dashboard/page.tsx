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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getFinancialSummary,
  getCategoryExpenses,
  getDailyExpenses,
  getMonthlyTrend,
  calculateFinancialScore,
} from '@/services/analytics.local';
import type {
  FinancialSummary,
  CategorySummary,
  DailyExpense,
  MonthlyTrend,
  FinancialScore,
} from '@/types';
import { formatCurrency, getMonthName } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Calendar,
  Loader2,
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
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<CategorySummary[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [financialScore, setFinancialScore] = useState<FinancialScore | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      const [summaryData, categoriesData, dailyData, trendData, scoreData] =
        await Promise.all([
          getFinancialSummary(user.id, selectedMonth),
          getCategoryExpenses(user.id, selectedMonth, 'despesa'),
          getDailyExpenses(user.id, selectedMonth),
          getMonthlyTrend(user.id),
          calculateFinancialScore(user.id, selectedMonth),
        ]);

      setSummary(summaryData);
      setCategoryExpenses(categoriesData);
      setDailyExpenses(dailyData);
      setMonthlyTrend(trendData);
      setFinancialScore(scoreData);

      setLoading(false);
    }

    loadData();
  }, [user, selectedMonth]);

  if (loading || !summary || !financialScore) {
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
            {getMonthName(selectedMonth)} {selectedMonth.getFullYear()}
          </p>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="month"
            value={`${selectedMonth.getFullYear()}-${String(
              selectedMonth.getMonth() + 1
            ).padStart(2, '0')}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1));
            }}
            className="px-3 py-2 border rounded-md"
          />
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
            <p className="text-xs text-muted-foreground">
              Economia: {summary.economia_percentual.toFixed(1)}%
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

      {/* Score Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle>Saúde Financeira</CardTitle>
          <CardDescription>{financialScore.mensagem}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Score Visual */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-8 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      financialScore.nivel === 'excelente'
                        ? 'bg-success'
                        : financialScore.nivel === 'bom'
                        ? 'bg-primary'
                        : financialScore.nivel === 'atencao'
                        ? 'bg-warning'
                        : 'bg-danger'
                    }`}
                    style={{ width: `${financialScore.score}%` }}
                  />
                </div>
              </div>
              <div className="text-3xl font-bold">{financialScore.score}</div>
            </div>

            {/* Fatores */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(financialScore.fatores).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      value ? 'bg-success' : 'bg-muted'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {key === 'saldo_positivo' && 'Saldo Positivo'}
                    {key === 'economia_adequada' && 'Economia Adequada'}
                    {key === 'sem_vencidos' && 'Sem Vencidos'}
                    {key === 'tendencia_positiva' && 'Tendência Positiva'}
                  </span>
                </div>
              ))}
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
    </div>
  );
}
