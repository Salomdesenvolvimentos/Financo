// ============================================
// FINACO - Página: Investimentos
// Carteira de investimentos pessoais
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from '@/services/investments.local';
import type { Investment, InvestmentFormData, InvestmentType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { usePlan } from '@/hooks/use-plan';
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Percent,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  RefreshCw,
  Globe,
  BarChart2,
  Newspaper,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { CryptoTicker } from '@/components/crypto-ticker';

// ============================================
// Sidebar de Mercado — cotações e informações do dia
// ============================================
interface ExchangeRate { code: string; name: string; bid: string; pctChange: string }
interface MarketIndicator { label: string; value: string; change?: string; positive?: boolean }

function MarketSidebar() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(true); // colapsado por padrão no mobile

  const fixedIndicators: MarketIndicator[] = [
    { label: 'SELIC (meta)', value: '13,75% a.a.', change: 'Banco Central', positive: false },
    { label: 'CDI',          value: '13,65% a.a.', change: 'Referência',    positive: true  },
    { label: 'IPCA (12m)',   value: '4,83%',        change: 'Inflação',      positive: false },
    { label: 'Ibovespa',     value: '~127.000 pts', change: 'B3',            positive: true  },
  ];

  const marketNews = [
    { emoji: '📉', text: 'Volatilidade global afeta mercados emergentes' },
    { emoji: '💰', text: 'CDBs pós-fixados seguem atrativos com SELIC alta' },
    { emoji: '🏦', text: 'Tesouro SELIC: liquidez diária com rentabilidade real' },
    { emoji: '📊', text: 'FIIs: rendimentos mensais acima da inflação' },
    { emoji: '🌍', text: 'Dólar influenciado por política monetária do Fed' },
    { emoji: '⚡', text: 'Diversificação reduz risco da carteira até 40%' },
  ];

  async function fetchRates() {
    setLoadingRates(true);
    try {
      const res = await fetch(
        'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,GBP-BRL',
        { cache: 'no-store', signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error('status ' + res.status);
      const data = await res.json();
      const mapped: ExchangeRate[] = [
        data.USDBRL && { code: 'USD', name: 'Dólar',         bid: parseFloat(data.USDBRL.bid).toFixed(2),  pctChange: data.USDBRL.pctChange },
        data.EURBRL && { code: 'EUR', name: 'Euro',          bid: parseFloat(data.EURBRL.bid).toFixed(2),  pctChange: data.EURBRL.pctChange },
        data.GBPBRL && { code: 'GBP', name: 'Libra',         bid: parseFloat(data.GBPBRL.bid).toFixed(2),  pctChange: data.GBPBRL.pctChange },
        data.BTCBRL && { code: 'BTC', name: 'Bitcoin (BRL)', bid: parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR', { maximumFractionDigits: 0 }), pctChange: data.BTCBRL.pctChange },
      ].filter(Boolean) as ExchangeRate[];
      setRates(mapped);
      setLastUpdate(new Date());
    } catch {
      // silently ignore — show placeholder
    } finally {
      setLoadingRates(false);
    }
  }

  useEffect(() => {
    fetchRates();
    const id = setInterval(fetchRates, 120_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="w-full lg:w-72 lg:shrink-0 space-y-4">
      {/* Botão toggle — visível apenas no mobile */}
      <button
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-500" />
          Mercado &amp; Indicadores
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {/* Conteúdo: sempre visível no desktop, colapsável no mobile */}
      <div className={`${collapsed ? 'hidden' : 'flex flex-col gap-4'} lg:flex lg:flex-col lg:gap-4`}>
      {/* Câmbio */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
              Câmbio ao vivo
            </CardTitle>
            <button
              onClick={fetchRates}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Atualizar câmbio"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingRates ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {lastUpdate && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {loadingRates && rates.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando cotações...
            </div>
          ) : rates.length === 0 ? (
            <p className="text-xs text-muted-foreground">Cotações indisponíveis no momento.</p>
          ) : (
            rates.map(r => {
              const pct = parseFloat(r.pctChange);
              const up  = pct >= 0;
              return (
                <div key={r.code} className="flex items-center justify-between py-1.5 border-b last:border-0 border-border/60">
                  <div>
                    <p className="text-xs font-semibold">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground">{r.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R$ {r.bid}</p>
                    <span className={`text-[10px] font-medium flex items-center justify-end gap-0.5 ${up ? 'text-emerald-500' : 'text-red-500'}`}>
                      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {up ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Indicadores fixos */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-violet-500" />
            Indicadores Brasil
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {fixedIndicators.map(ind => (
            <div key={ind.label} className="flex items-center justify-between py-1 border-b last:border-0 border-border/60">
              <div>
                <p className="text-xs font-medium">{ind.label}</p>
                {ind.change && <p className="text-[10px] text-muted-foreground">{ind.change}</p>}
              </div>
              <span className={`text-xs font-bold ${ind.positive ? 'text-emerald-500' : 'text-orange-500'}`}>
                {ind.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dicas e notícias do mercado */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Newspaper className="h-4 w-4 text-amber-500" />
            Dicas &amp; Mercado
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2.5">
          {marketNews.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-base leading-none mt-0.5">{n.emoji}</span>
              <p className="leading-snug">{n.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      </div>
    </aside>
  );
}

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  cdb: 'CDB',
  acoes: 'Ações',
  fii: 'FII',
  tesouro_direto: 'Tesouro Direto',
  crypto: 'Cripto',
  poupanca: 'Poupança',
  lci_lca: 'LCI/LCA',
  outro: 'Outro',
};

const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  cdb: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  acoes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  fii: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  tesouro_direto: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  crypto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  poupanca: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  lci_lca: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  outro: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const DEFAULT_FORM: InvestmentFormData = {
  nome: '',
  tipo: 'cdb',
  instituicao: '',
  valor_investido: 0,
  valor_atual: 0,
  data_inicio: new Date().toISOString().split('T')[0],
  vencimento: '',
  rentabilidade_anual: undefined,
  notas: '',
  ativo: true,
};

export default function InvestmentsPage() {
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState<InvestmentFormData>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterTipo, setFilterTipo] = useState<InvestmentType | 'todos'>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!user) return;
    loadInvestments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadInvestments() {
    if (!user) return;
    setLoading(true);
    const result = await getInvestments(user.id);
    if (result.data) setInvestments(result.data);
    setLoading(false);
  }

  function openForm(investment?: Investment) {
    if (investment) {
      setEditingInvestment(investment);
      setFormData({
        nome: investment.nome,
        tipo: investment.tipo,
        instituicao: investment.instituicao,
        valor_investido: investment.valor_investido,
        valor_atual: investment.valor_atual,
        data_inicio: investment.data_inicio,
        vencimento: investment.vencimento ?? '',
        rentabilidade_anual: investment.rentabilidade_anual,
        notas: investment.notas ?? '',
        ativo: investment.ativo,
      });
    } else {
      setEditingInvestment(null);
      setFormData(DEFAULT_FORM);
    }
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingInvestment(null);
    setFormData(DEFAULT_FORM);
  }

  async function handleSubmit() {
    if (!user) return;
    if (!formData.nome.trim() || !formData.instituicao.trim()) return;
    setSubmitting(true);

    const payload: InvestmentFormData = {
      ...formData,
      valor_investido: Number(formData.valor_investido),
      valor_atual: Number(formData.valor_atual),
      rentabilidade_anual: formData.rentabilidade_anual ? Number(formData.rentabilidade_anual) : undefined,
      vencimento: formData.vencimento || undefined,
      notas: formData.notas || undefined,
    };

    if (editingInvestment) {
      await updateInvestment(editingInvestment.id, payload);
    } else {
      await createInvestment(user.id, payload);
    }

    await loadInvestments();
    closeForm();
    setSubmitting(false);
  }

  async function handleDelete(investment: Investment) {
    if (!confirm(`Remover "${investment.nome}"?`)) return;
    await deleteInvestment(investment.id);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(investment.id); return n; });
    await loadInvestments();
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Excluir ${selectedIds.size} investimento${selectedIds.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.`)) return;
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await deleteInvestment(id);
    }
    setSelectedIds(new Set());
    await loadInvestments();
    setBulkDeleting(false);
  }

  const filtered = filterTipo === 'todos'
    ? investments
    : investments.filter((inv) => inv.tipo === filterTipo);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allOnPageSelected = paginated.length > 0 && paginated.every((inv) => selectedIds.has(inv.id));

  const totalInvestido = investments.reduce((s, inv) => s + inv.valor_investido, 0);
  const totalAtual = investments.reduce((s, inv) => s + inv.valor_atual, 0);
  const lucro = totalAtual - totalInvestido;
  const rentabilidadeTotal = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;

  if (!isPremium) {
    return (
      <div className="container max-w-2xl py-16 flex flex-col items-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Crown className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Carteira de Investimentos</h1>
          <p className="text-muted-foreground max-w-sm">Disponível no plano <strong>Premium</strong>. Faça upgrade para gerenciar sua carteira de investimentos.</p>
        </div>
        <Link href="/dashboard/subscription">
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
            <Crown className="h-4 w-4" />
            Fazer upgrade para Premium
          </button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 space-y-6">
      {/* Ticker de Criptomoedas */}
      <CryptoTicker />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Investimentos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua carteira de investimentos</p>
        </div>
        <Button onClick={() => openForm()} disabled={formOpen} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Investimento
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestido)}</div>
            <p className="text-xs text-muted-foreground">{investments.length} ativo{investments.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAtual)}</div>
            <p className="text-xs text-muted-foreground">Patrimônio total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro / Perda</CardTitle>
            {lucro >= 0
              ? <TrendingUp className="h-4 w-4 text-success" />
              : <TrendingDown className="h-4 w-4 text-danger" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lucro >= 0 ? 'text-success' : 'text-danger'}`}>
              {lucro >= 0 ? '+' : ''}{formatCurrency(lucro)}
            </div>
            <p className="text-xs text-muted-foreground">Resultado absoluto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${rentabilidadeTotal >= 0 ? 'text-success' : 'text-danger'}`}>
              {rentabilidadeTotal >= 0 ? '+' : ''}{rentabilidadeTotal.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Sobre o capital investido</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulário inline */}
      {formOpen && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: CDB Nubank 120% CDI"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v as InvestmentType })}
                >
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(INVESTMENT_TYPE_LABELS) as [InvestmentType, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="instituicao">Instituição *</Label>
                <Input
                  id="instituicao"
                  placeholder="Ex: Nubank, XP, B3"
                  value={formData.instituicao}
                  onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor_investido">Valor Investido (R$) *</Label>
                <Input
                  id="valor_investido"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor_investido || ''}
                  onChange={(e) => setFormData({ ...formData, valor_investido: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor_atual">Valor Atual (R$) *</Label>
                <Input
                  id="valor_atual"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valor_atual || ''}
                  onChange={(e) => setFormData({ ...formData, valor_atual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rentabilidade_anual">Rentabilidade a.a. (%)</Label>
                <Input
                  id="rentabilidade_anual"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 12.5"
                  value={formData.rentabilidade_anual ?? ''}
                  onChange={(e) => setFormData({ ...formData, rentabilidade_anual: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="data_inicio">Data de Início *</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vencimento">Vencimento</Label>
                <Input
                  id="vencimento"
                  type="date"
                  value={formData.vencimento || ''}
                  onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notas">Notas</Label>
                <Input
                  id="notas"
                  placeholder="Observações opcionais"
                  value={formData.notas || ''}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.nome.trim() || !formData.instituicao.trim()}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {editingInvestment ? 'Salvar' : 'Criar Investimento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Carteira</CardTitle>
              <CardDescription>{filtered.length} investimento{filtered.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="gap-2"
                >
                  {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Excluir {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </Button>
              )}
              <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v as InvestmentType | 'todos'); setCurrentPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Filtrar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {(Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[]).map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{INVESTMENT_TYPE_LABELS[tipo]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Nenhum investimento encontrado</p>
              <p className="text-sm mt-1">Clique em &quot;Novo Investimento&quot; para começar</p>
            </div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {paginated.map((inv) => {
                const diff = inv.valor_atual - inv.valor_investido;
                const pct = inv.valor_investido > 0 ? (diff / inv.valor_investido) * 100 : 0;
                return (
                  <div key={inv.id} className={`rounded-lg border p-4 space-y-3 ${selectedIds.has(inv.id) ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded shrink-0"
                          checked={selectedIds.has(inv.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const n = new Set(prev);
                              if (e.target.checked) n.add(inv.id); else n.delete(inv.id);
                              return n;
                            });
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{inv.nome}</p>
                          {inv.notas && <p className="text-xs text-muted-foreground truncate">{inv.notas}</p>}
                        </div>
                      </div>
                      <p className={`text-base font-bold shrink-0 ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(inv.valor_atual)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${INVESTMENT_TYPE_COLORS[inv.tipo]}`}>
                        {INVESTMENT_TYPE_LABELS[inv.tipo]}
                      </span>
                      {inv.instituicao && (
                        <span className="text-xs text-muted-foreground">{inv.instituicao}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Investido</p>
                        <p className="font-medium">{formatCurrency(inv.valor_investido)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ganho/Perda</p>
                        <p className={`font-semibold ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                          {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          <span className="text-xs ml-1">({diff >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
                        </p>
                      </div>
                      {inv.rentabilidade_anual != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">Rent./ano</p>
                          <p className="font-medium">{inv.rentabilidade_anual}% a.a.</p>
                        </div>
                      )}
                      {inv.vencimento && (
                        <div>
                          <p className="text-xs text-muted-foreground">Vencimento</p>
                          <p className="font-medium">{new Date(inv.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1 border-t">
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" onClick={() => openForm(inv)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:text-destructive" onClick={() => handleDelete(inv)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-1">
                <RotateCcw className="h-3 w-3" /> Gire o dispositivo para ver a tabela completa
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto -mx-6">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="py-3 px-6 w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={allOnPageSelected}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) {
                              paginated.forEach((inv) => n.add(inv.id));
                            } else {
                              paginated.forEach((inv) => n.delete(inv.id));
                            }
                            return n;
                          });
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Nome</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Tipo</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Instituição</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Investido</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Atual</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ganho/Perda</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Rent./ano</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Vencimento</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((inv) => {
                    const diff = inv.valor_atual - inv.valor_investido;
                    const pct = inv.valor_investido > 0 ? (diff / inv.valor_investido) * 100 : 0;
                    return (
                      <tr key={inv.id} className={`border-b hover:bg-muted/30 transition-colors ${selectedIds.has(inv.id) ? 'bg-primary/5' : ''}`}>
                        <td className="py-3 px-6">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded"
                            checked={selectedIds.has(inv.id)}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const n = new Set(prev);
                                if (e.target.checked) n.add(inv.id); else n.delete(inv.id);
                                return n;
                              });
                            }}
                          />
                        </td>
                        <td className="py-3 px-6">
                          <div>
                            <p className="text-sm font-medium">{inv.nome}</p>
                            {inv.notas && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{inv.notas}</p>}
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${INVESTMENT_TYPE_COLORS[inv.tipo]}`}>
                            {INVESTMENT_TYPE_LABELS[inv.tipo]}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <span className="text-sm text-muted-foreground">{inv.instituicao}</span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className="text-sm">{formatCurrency(inv.valor_investido)}</span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className="text-sm font-medium">{formatCurrency(inv.valor_atual)}</span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            </p>
                            <p className={`text-xs ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                              {diff >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="text-sm text-muted-foreground">
                            {inv.rentabilidade_anual != null ? `${inv.rentabilidade_anual}% a.a.` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="text-sm text-muted-foreground">
                            {inv.vencimento ? new Date(inv.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm(inv)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(inv)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>            </>          )}
          {/* Paginação */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Linhas por página:</span>
                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}
                >
                  <SelectTrigger className="h-8 w-16 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      {/* Sidebar de Mercado */}
      <MarketSidebar />
    </div>
  );
}
