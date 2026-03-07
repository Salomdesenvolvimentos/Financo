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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getInvestments,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from '@/services/investments.local';
import type { Investment, InvestmentFormData, InvestmentType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Percent,
} from 'lucide-react';

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
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [formData, setFormData] = useState<InvestmentFormData>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filterTipo, setFilterTipo] = useState<InvestmentType | 'todos'>('todos');

  useEffect(() => {
    if (!user) return;
    loadInvestments();
  }, [user]);

  async function loadInvestments() {
    if (!user) return;
    setLoading(true);
    const result = await getInvestments(user.id);
    if (result.data) setInvestments(result.data);
    setLoading(false);
  }

  function openDialog(investment?: Investment) {
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
    setDialogOpen(true);
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
    setDialogOpen(false);
    setSubmitting(false);
  }

  async function handleDelete(investment: Investment) {
    if (!confirm(`Remover "${investment.nome}"?`)) return;
    await deleteInvestment(investment.id);
    await loadInvestments();
  }

  const filtered = filterTipo === 'todos'
    ? investments
    : investments.filter((inv) => inv.tipo === filterTipo);

  const totalInvestido = investments.reduce((s, inv) => s + inv.valor_investido, 0);
  const totalAtual = investments.reduce((s, inv) => s + inv.valor_atual, 0);
  const lucro = totalAtual - totalInvestido;
  const rentabilidadeTotal = totalInvestido > 0 ? (lucro / totalInvestido) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Investimentos</h1>
          <p className="text-muted-foreground">Acompanhe sua carteira de investimentos</p>
        </div>
        <Button onClick={() => openDialog()}>
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

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle>Carteira</CardTitle>
              <CardDescription>{filtered.length} investimento{filtered.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <Select value={filterTipo} onValueChange={(v) => setFilterTipo(v as InvestmentType | 'todos')}>
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
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Nenhum investimento encontrado</p>
              <p className="text-sm mt-1">Clique em &quot;Novo Investimento&quot; para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
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
                  {filtered.map((inv) => {
                    const diff = inv.valor_atual - inv.valor_investido;
                    const pct = inv.valor_investido > 0 ? (diff / inv.valor_investido) * 100 : 0;
                    return (
                      <tr key={inv.id} className="border-b hover:bg-muted/30 transition-colors">
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(inv)}>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInvestment ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
            <DialogDescription>
              {editingInvestment ? 'Atualize os dados do investimento.' : 'Preencha os dados do novo investimento.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Ex: CDB Nubank 120% CDI"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v as InvestmentType })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rentabilidade_anual">Rentabilidade Anual (%)</Label>
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
              <Label htmlFor="notas">Notas</Label>
              <Input
                id="notas"
                placeholder="Observações opcionais"
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !formData.nome.trim() || !formData.instituicao.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingInvestment ? 'Salvar' : 'Criar Investimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
