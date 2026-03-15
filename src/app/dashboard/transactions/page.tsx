// ============================================
// Página: Transações
// Tabela completa de transações financeiras
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api-url';
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
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactions.local';
import { getCategories } from '@/services/categories.local';
import type {
  Transaction,
  TransactionFormData,
  TransactionFilters,
  Category,
} from '@/types';
import { formatCurrency, formatDate, formatDateISO } from '@/lib/utils';
import { isFaturaByDescription, analyzeFaturaMatch } from '@/lib/credit-card-utils';
import { CategoryModal } from '@/components/category-modal';
import { CategoryEditModal } from '@/components/category-edit-modal';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Tag,
  ChevronDown,
  Pencil,
  Filter,
  RotateCcw,
} from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  // Separate month and year selectors (combine into filters.mes)
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  // inline editing state for spreadsheet-like table
  const [editingCell, setEditingCell] = useState<
    { id: string; field: keyof Transaction } | null
  >(null);
  const [editingValue, setEditingValue] = useState<any>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditModalOpen, setCategoryEditModalOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Cartões de crédito vindos do Pluggy (Open Finance)
  const [pluggyCreditCards, setPluggyCreditCards] = useState<any[]>([]);
  // Controla visibilidade dos filtros no mobile
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    descricao: '',
    tipo: 'despesa',
    categoria_id: '',
    responsavel: '',
    status: 'andamento',
    valor: 0,
    data_transacao: formatDateISO(new Date()),
    data_vencimento: '',
    forma_pagamento: '',
    parcelado: false,
    total_parcelas: 1,
    parcela_atual: 1,
    observacoes: '',
    is_fatura: false,
    modalidade_pagamento: undefined,
  });

  // Carregar dados iniciais
  // também escutar query param para resetar filtros
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setFilters({});
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      const [transactionsData, categoriesData] = await Promise.all([
        getTransactions(filters),
        getCategories(user?.id || ''),
      ]);

      if (transactionsData.data) {
        setTransactions(transactionsData.data);
      }

      if (categoriesData.data) {
        setCategories(categoriesData.data);
      }

      setLoading(false);
    }

    loadData();
  }, [user, filters]);

  // Buscar contas de crédito do Pluggy (Open Finance) para exibir faturas em tempo real
  useEffect(() => {
    const itemId = typeof window !== 'undefined' ? localStorage.getItem('pluggy_item_id') : null;
    if (!itemId) return;
    (async () => {
      try {
        const res = await fetch(apiUrl(`/api/pluggy/accounts?itemId=${itemId}`));
        const data = await res.json();
        const accounts: any[] = data.results ?? data.accounts ?? [];
        setPluggyCreditCards(accounts.filter((a: any) => a.type === 'CREDIT'));
      } catch {}
    })();
  }, []);

  // keep editingValue in sync when we start editing a cell
  useEffect(() => {
    if (editingCell) {
      const t = transactions.find((t) => t.id === editingCell.id);
      if (t) {
        setEditingValue(t[editingCell.field] ?? '');
      }
    } else {
      setEditingValue('');
    }
  }, [editingCell, transactions]);

  // helper for inline saving
  const handleInlineSave = async (
    id: string,
    field: keyof Transaction,
    value: any
  ) => {
    setLoading(true);
    // if this is a temporary new row, call createTransaction instead
    if (id.startsWith('new-')) {
      const newObj: any = { [field]: value, user_id: user?.id };
      // also include any other filled fields from state
      const orig = transactions.find((t) => t.id === id);
      if (orig) Object.assign(newObj, orig);
      delete newObj.id;

      const { data, error } = await createTransaction(newObj as any);
      if (error) {
        toast({
          title: 'Erro ao criar transação',
          description: error,
          variant: 'destructive',
        });
      } else if (data) {
        // replace temp row with returned one
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? data : t))
        );
        id = data.id;
      }
    } else {
      const { error } = await updateTransaction(id, { [field]: value } as any);
      if (error) {
        toast({
          title: 'Erro ao atualizar transação',
          description: error,
          variant: 'destructive',
        });
      }
    }
    // update local state regardless
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value } as Transaction;
        if (field === 'categoria_id') {
          updated.categoria =
            categories.find((c) => c.id === value) || undefined;
        }
        return updated;
      })
    );
    setLoading(false);
    setEditingCell(null);
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    id: string,
    field: keyof Transaction,
    value: any
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInlineSave(id, field, value);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Abrir dialog para nova transação
  // create a new blank row at top and start editing the description
  const handleNewTransaction = () => {
    const tempId = `new-${Date.now()}`;
    const blank: Transaction = {
      id: tempId,
      numero: 0,
      descricao: '',
      tipo: 'despesa',
      categoria_id: '',
      categoria: undefined,
      responsavel: user?.nome || '',
      status: 'andamento',
      valor: 0,
      data_transacao: formatDateISO(new Date()),
      data_vencimento: '',
      forma_pagamento: '',
      parcelado: false,
      total_parcelas: 1,
      parcela_atual: 1,
      observacoes: '',
      user_id: user?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTransactions((prev) => [blank, ...prev]);
    // start editing first cell of new row
    setEditingCell({ id: tempId, field: 'descricao' });
  };

  // Abrir dialog para edição
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      descricao: transaction.descricao,
      tipo: transaction.tipo,
      categoria_id: transaction.categoria_id || '',
      responsavel: transaction.responsavel || '',
      status: transaction.status,
      valor: Number(transaction.valor),
      data_transacao: transaction.data_transacao,
      data_vencimento: transaction.data_vencimento || '',
      forma_pagamento: transaction.forma_pagamento || '',
      parcelado: transaction.parcelado,
      total_parcelas: transaction.total_parcelas,
      parcela_atual: transaction.parcela_atual ?? 1,
      observacoes: transaction.observacoes || '',
      is_fatura: transaction.is_fatura || false,
      modalidade_pagamento: transaction.modalidade_pagamento || undefined,
    });
    setDialogOpen(true);
  };

  // Salvar transação
  const handleSaveTransaction = async () => {
    if (!user) return;

    setLoading(true);

    if (editingTransaction) {
      // Atualizar existente
      const { error } = await updateTransaction(editingTransaction.id, formData);

      if (error) {
        toast({
          title: 'Erro ao atualizar transação',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Transação atualizada!',
          variant: 'success',
        });
        setDialogOpen(false);
        // Recarregar transações
        const { data } = await getTransactions(filters);
        if (data) setTransactions(data);
      }
    } else {
      // Criar nova
      const transactionToCreate = { ...formData, user_id: user!.id };
      const { error } = await createTransaction(transactionToCreate as any);

      if (error) {
        toast({
          title: 'Erro ao criar transação',
          description: error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Transação criada!',
          variant: 'success',
        });
        setDialogOpen(false);
        // Recarregar transações
        const { data } = await getTransactions(filters);
        if (data) setTransactions(data);
      }
    }

    setLoading(false);
  };

  // Deletar transação
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    setLoading(true);
    const { error } = await deleteTransaction(id);

    if (error) {
      toast({
        title: 'Erro ao excluir transação',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Transação excluída!',
        variant: 'success',
      });
      // Recarregar transações
      const { data } = await getTransactions(filters);
      if (data) setTransactions(data);
    }

    setLoading(false);
  };

  // Marcar/desmarcar transação como fatura de cartão
  const handleToggleFatura = async (transaction: Transaction) => {
    const newValue = !transaction.is_fatura;
    const { error } = await updateTransaction(transaction.id, { is_fatura: newValue } as any);
    if (error) {
      toast({
        title: 'Erro ao atualizar transação',
        description: error,
        variant: 'destructive',
      });
      return;
    }
    setTransactions((prev) =>
      prev.map((t) => (t.id === transaction.id ? { ...t, is_fatura: newValue } : t))
    );
    toast({
      title: newValue
        ? '💳 Fatura marcada — excluída do total de despesas'
        : 'Fatura desmarcada — valor voltará ao total de despesas',
      variant: 'success',
    });
  };

  // Deletar TODAS as transações
  const handleDeleteAll = async () => {
    if (!confirm(`Tem certeza que deseja excluir TODAS as ${transactions.length} transações? Esta ação não pode ser desfeita!`)) return;

    setLoading(true);
    let errorCount = 0;

    // Deletar todas as transações uma por uma
    for (const transaction of transactions) {
      const { error } = await deleteTransaction(transaction.id);
      if (error) errorCount++;
    }

    if (errorCount > 0) {
      toast({
        title: `Erro ao excluir ${errorCount} transações`,
        description: 'Algumas transações não puderam ser excluídas',
        variant: 'destructive',
      });
    } else {
      toast({
        title: `${transactions.length} transações excluídas!`,
        variant: 'success',
      });
    }

    // Recarregar transações
    const { data } = await getTransactions(filters);
    if (data) setTransactions(data);

    setLoading(false);
  };

  // Filtrar transações localmente por busca
  const filteredTransactions = transactions.filter((t) =>
    searchTerm
      ? t.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset para primeira página ao mudar filtros ou busca
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-4">

      {/* Card de Faturas de Cartão */}
      {(() => {
        // Parcelas futuras (andamento) agrupadas por cartão para exibir abaixo de cada linha
        const parcelasFuturas = transactions.filter(
          (t) => t.status === 'andamento' && t.tipo === 'despesa' && !t.is_fatura
        );
        const parcelasPorCartao = new Map<string, { count: number; total: number }>();
        parcelasFuturas.forEach((t) => {
          const card = t.forma_pagamento || 'Outros';
          const prev = parcelasPorCartao.get(card) ?? { count: 0, total: 0 };
          parcelasPorCartao.set(card, { count: prev.count + 1, total: prev.total + Number(t.valor) });
        });

        // ── Fonte primária: contas de crédito do Pluggy (Open Finance) ──
        if (pluggyCreditCards.length > 0) {
          const totalFatura = pluggyCreditCards.reduce(
            (sum, a) => sum + Math.abs(Number(a.balance ?? 0)),
            0
          );
          return (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Faturas de Cartão</span>
                  <span className="text-xs text-amber-500 dark:text-amber-400 font-normal">· Open Finance</span>
                </div>
                <span className="text-lg font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalFatura)}</span>
              </div>
              <div className="mt-2 space-y-1.5 border-t border-amber-200 dark:border-amber-700 pt-2">
                {pluggyCreditCards.map((card) => {
                  const fatura = Math.abs(Number(card.balance ?? 0));
                  const dueDate = card.creditData?.balanceDueDate
                    ? new Date(card.creditData.balanceDueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    : null;
                  const parcelas = parcelasPorCartao.get(card.name);
                  return (
                    <div key={card.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 dark:text-amber-300">{card.name}</span>
                        {parcelas && parcelas.count > 0 && (
                          <span className="text-xs text-muted-foreground bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                            +{parcelas.count} parcela{parcelas.count > 1 ? 's' : ''} futura{parcelas.count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {dueDate && (
                          <span className="text-xs text-muted-foreground">vence {dueDate}</span>
                        )}
                        <span className="font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(fatura)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Fallback: transações marcadas como is_fatura (agrupadas por cartão) ──
        const faturas = transactions.filter((t) => t.is_fatura);
        if (faturas.length === 0 && parcelasFuturas.length === 0) return null;
        const totalFaturaLocal = faturas.reduce((s, t) => s + Number(t.valor), 0);
        const byCard = new Map<string, number>();
        faturas.forEach((t) => {
          const card = t.forma_pagamento || t.descricao || 'Cartão';
          byCard.set(card, (byCard.get(card) ?? 0) + Number(t.valor));
        });
        return (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Faturas de Cartão</span>
              </div>
              {totalFaturaLocal > 0 && (
                <span className="text-lg font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalFaturaLocal)}</span>
              )}
            </div>
            {byCard.size > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-amber-200 dark:border-amber-700 pt-2">
                {Array.from(byCard.entries()).map(([card, total]) => {
                  const parcelas = parcelasPorCartao.get(card);
                  return (
                    <div key={card} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 dark:text-amber-300">{card}</span>
                        {parcelas && parcelas.count > 0 && (
                          <span className="text-xs text-muted-foreground bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                            +{parcelas.count} parcela{parcelas.count > 1 ? 's' : ''} futura{parcelas.count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-amber-800 dark:text-amber-200">{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {faturas.length === 0 && parcelasFuturas.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Conecte seu banco via Open Finance (Importação) para ver faturas em tempo real.
              </p>
            )}
            {faturas.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Use o botão <CreditCard className="inline h-3 w-3 mx-0.5" /> em cada linha para marcar/desmarcar faturas.
              </p>
            )}
          </div>
        );
      })()}

      {/* Barra de Controle — mobile-first */}
      <div className="space-y-2">
        {/* Linha principal: busca + ações */}
        <div className="flex gap-2 items-center">
          <Input
            id="search"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 flex-1 min-w-0"
          />
          <Button onClick={handleNewTransaction} size="sm" className="gap-1 flex-shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex-shrink-0 gap-1 sm:hidden ${
              filtersOpen ? 'bg-primary/10 border-primary/50 text-primary' : ''
            }`}
            title="Mostrar/ocultar filtros"
          >
            <Filter className="h-4 w-4" />
            {[filters.tipo, filters.categoria_id, filters.forma_pagamento, filters.mes].filter(Boolean).length > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {[filters.tipo, filters.categoria_id, filters.forma_pagamento, filters.mes].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            disabled={loading || transactions.length === 0}
            title="Excluir todas as transações"
            className="flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {/* Categoria dropdown */}
          <div className="relative flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setCategoryDropdownOpen((v) => !v)}
            >
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Categoria</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
            {categoryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCategoryDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-background border rounded-lg shadow-lg overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                    onClick={() => { setCategoryModalOpen(true); setCategoryDropdownOpen(false); }}
                  >
                    <Plus className="h-4 w-4" /> Nova Categoria
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                    onClick={() => { setCategoryEditModalOpen(true); setCategoryDropdownOpen(false); }}
                  >
                    <Pencil className="h-4 w-4" /> Editar Categorias
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Painel de filtros: colapsável no mobile, sempre visível no desktop */}
        <div className={`${filtersOpen ? 'flex' : 'hidden'} sm:flex gap-2 flex-wrap`}>
          <div className="min-w-[120px]">
            <Label htmlFor="filter-type" className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
            <Select
              value={filters.tipo || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, tipo: value === 'all' ? undefined : (value as any) })
              }
            >
              <SelectTrigger id="filter-type" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px]">
            <Label htmlFor="filter-category" className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
            <Select
              value={filters.categoria_id || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, categoria_id: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger id="filter-category" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[130px]">
            <Label htmlFor="filter-card" className="text-xs text-muted-foreground mb-1 block">Cartão</Label>
            <Select
              value={filters.forma_pagamento || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, forma_pagamento: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger id="filter-card" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Nubank">Nubank</SelectItem>
                <SelectItem value="Santander">Santander</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Pix">Pix</SelectItem>
                <SelectItem value="Transferência">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[100px]">
            <Label htmlFor="filter-year" className="text-xs text-muted-foreground mb-1 block">Ano</Label>
            <Select
              value={filterYear || 'all'}
              onValueChange={(value) => {
                const y = value === 'all' ? '' : value;
                setFilterYear(y);
                const m = filterMonth;
                setFilters({ ...filters, mes: y && m ? `${y}-${m}` : undefined });
              }}
            >
              <SelectTrigger id="filter-year" className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = String(new Date().getFullYear() - 2 + i);
                  return <SelectItem key={y} value={y}>{y}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <Label htmlFor="filter-month" className="text-xs text-muted-foreground mb-1 block">Mês</Label>
            <Select
              value={filterMonth || 'all'}
              onValueChange={(value) => {
                const m = value === 'all' ? '' : value;
                setFilterMonth(m);
                const y = filterYear;
                setFilters({ ...filters, mes: y && m ? `${y}-${m}` : undefined });
              }}
            >
              <SelectTrigger id="filter-month" className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription className="mt-1">
                {filteredTransactions.length} registro{filteredTransactions.length !== 1 ? 's' : ''} encontrado{filteredTransactions.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Vista em cards — mobile */}
              <div className="sm:hidden space-y-2">
                {paginatedTransactions.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                ) : paginatedTransactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-3 space-y-1.5 hover:bg-muted/20 transition-colors">
                    {/* Linha 1: descrição + valor */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{transaction.descricao}</p>
                        {transaction.is_fatura && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-300 dark:border-amber-700 mt-0.5">
                            <CreditCard className="h-2.5 w-2.5" />
                            Fatura
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${transaction.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                        {transaction.tipo === 'despesa' ? '−' : '+'}{formatCurrency(Number(transaction.valor))}
                      </span>
                    </div>
                    {/* Linha 2: tipo + categoria */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        transaction.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                      {transaction.categoria?.nome && (
                        <span className="text-xs text-muted-foreground">{transaction.categoria.nome}</span>
                      )}
                      {transaction.parcelado && (
                        <span className="text-[11px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded">
                          {transaction.parcela_atual ?? 1}/{transaction.total_parcelas ?? 1}x
                        </span>
                      )}
                    </div>
                    {/* Linha 3: data + status + cartão */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDate(transaction.data_transacao)}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium ${
                        transaction.status === 'pago' ? 'bg-success/10 text-success' :
                        transaction.status === 'vencido' ? 'bg-danger/10 text-danger' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {transaction.status === 'pago' ? 'Pago' : transaction.status === 'vencido' ? 'Vencido' : 'Em Andamento'}
                      </span>
                      {transaction.forma_pagamento && <span>{transaction.forma_pagamento}</span>}
                    </div>
                    {/* Ações */}
                    <div className="flex justify-end gap-1 pt-1 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${transaction.is_fatura ? 'text-amber-600' : 'text-muted-foreground'}`}
                        title={transaction.is_fatura ? 'Desmarcar Fatura' : 'Marcar como Fatura'}
                        onClick={() => handleToggleFatura(transaction)}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTransaction(transaction)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDeleteTransaction(transaction.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Dica de tela landscape */}
                {paginatedTransactions.length > 0 && (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2 opacity-60">
                    <RotateCcw className="h-3 w-3" />
                    Vire o celular para ver a tabela completa
                  </p>
                )}
              </div>

              {/* Tabela completa — desktop */}
              <div className="hidden sm:block overflow-x-auto -mx-6">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b bg-muted/40 hover:bg-muted/40">
                    <th className="text-left py-3 px-6 font-medium text-sm">Descrição</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Tipo</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Categoria</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Cartão</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Modalidade</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Parcelas</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Valor</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Data</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/30 transition-colors">
                      {/* Descrição editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'descricao' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'descricao' ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() =>
                              handleInlineSave(
                                transaction.id,
                                'descricao',
                                editingValue
                              )
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, transaction.id, 'descricao', editingValue)
                            }
                            autoFocus
                          />
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{transaction.descricao}</span>
                            {transaction.is_fatura && (
                              <span
                                title="Pagamento de fatura — excluído do total de despesas para evitar dupla contagem"
                                className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                              >
                                <CreditCard className="h-2.5 w-2.5" />
                                Fatura — excluída do total
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Tipo editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'tipo' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'tipo' ? (
                          <Select
                            value={editingValue}
                            onValueChange={(v) => {
                              setEditingValue(v);
                              handleInlineSave(transaction.id, 'tipo', v);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="receita">Receita</SelectItem>
                              <SelectItem value="despesa">Despesa</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              transaction.tipo === 'receita'
                                ? 'bg-success/10 text-success'
                                : 'bg-danger/10 text-danger'
                            }`}
                          >
                            {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </span>
                        )}
                      </td>

                      {/* Categoria editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'categoria_id' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'categoria_id' ? (
                          <Select
                            value={editingValue}
                            onValueChange={(v) => {
                              setEditingValue(v);
                              handleInlineSave(
                                transaction.id,
                                'categoria_id',
                                v
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories
                                .filter((c) => c.tipo === transaction.tipo)
                                .map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">{transaction.categoria?.nome || '-'}</span>
                        )}
                      </td>

                      {/* Cartão/origem editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'forma_pagamento' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'forma_pagamento' ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() =>
                              handleInlineSave(
                                transaction.id,
                                'forma_pagamento',
                                editingValue
                              )
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(
                                e,
                                transaction.id,
                                'forma_pagamento',
                                editingValue
                              )
                            }
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm">{transaction.forma_pagamento || '-'}</span>
                        )}
                      </td>

                      {/* Modalidade editable (à vista / crédito) */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'modalidade_pagamento' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'modalidade_pagamento' ? (
                          <Select
                            value={editingValue || ''}
                            onValueChange={(v) => {
                              setEditingValue(v);
                              handleInlineSave(transaction.id, 'modalidade_pagamento', v || undefined);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="a_vista">À Vista</SelectItem>
                              <SelectItem value="credito">Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              transaction.modalidade_pagamento === 'credito'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                : transaction.modalidade_pagamento === 'a_vista'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {transaction.modalidade_pagamento === 'credito'
                              ? 'Crédito'
                              : transaction.modalidade_pagamento === 'a_vista'
                              ? 'À Vista'
                              : '-'}
                          </span>
                        )}
                      </td>

                      {/* Parcelas — clicável só se parcelado */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() => {
                          if (transaction.parcelado) {
                            setEditingCell({ id: transaction.id, field: 'parcela_atual' });
                            setEditingValue(String(transaction.parcela_atual ?? 1));
                          }
                        }}
                      >
                        {editingCell?.id === transaction.id && editingCell.field === 'parcela_atual' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number" min="1" max={transaction.total_parcelas}
                              value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              onBlur={() => handleInlineSave(transaction.id, 'parcela_atual', Number(editingValue))}
                              onKeyDown={e => handleCellKeyDown(e, transaction.id, 'parcela_atual', editingValue)}
                              className="w-14 h-7 text-xs"
                              autoFocus
                            />
                            <span className="text-xs text-muted-foreground">/{transaction.total_parcelas}</span>
                          </div>
                        ) : transaction.parcelado ? (
                          <span className="text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded">
                            {transaction.parcela_atual ?? 1}/{transaction.total_parcelas ?? 1}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Valor editable */}
                      <td
                        className="py-3 px-6 text-right cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'valor' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'valor' ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() =>
                              handleInlineSave(
                                transaction.id,
                                'valor',
                                Number(editingValue)
                              )
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(e, transaction.id, 'valor', editingValue)
                            }
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-semibold">{formatCurrency(Number(transaction.valor))}</span>
                        )}
                      </td>

                      {/* Data editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'data_transacao' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'data_transacao' ? (
                          <Input
                            type="date"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() =>
                              handleInlineSave(
                                transaction.id,
                                'data_transacao',
                                editingValue
                              )
                            }
                            onKeyDown={(e) =>
                              handleCellKeyDown(
                                e,
                                transaction.id,
                                'data_transacao',
                                editingValue
                              )
                            }
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{formatDate(transaction.data_transacao)}</span>
                        )}
                      </td>

                      {/* Status editable */}
                      <td
                        className="py-3 px-6 cursor-pointer"
                        onClick={() =>
                          setEditingCell({ id: transaction.id, field: 'status' })
                        }
                      >
                        {editingCell?.id === transaction.id &&
                        editingCell.field === 'status' ? (
                          <Select
                            value={editingValue}
                            onValueChange={(v) => {
                              setEditingValue(v);
                              handleInlineSave(transaction.id, 'status', v);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pago">Pago</SelectItem>
                              <SelectItem value="andamento">Em Andamento</SelectItem>
                              <SelectItem value="vencido">Vencido</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              transaction.status === 'pago'
                                ? 'bg-success/10 text-success'
                                : transaction.status === 'vencido'
                                ? 'bg-danger/10 text-danger'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {transaction.status === 'pago'
                              ? 'Pago'
                              : transaction.status === 'vencido'
                              ? 'Vencido'
                              : 'Em Andamento'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${transaction.is_fatura ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
                            title={transaction.is_fatura ? 'Desmarcar como Fatura de Cartão' : 'Marcar como Fatura de Cartão (evita dupla contagem)'}
                            onClick={() => handleToggleFatura(transaction)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
            </>
          )}
        </CardContent>

        {/* Paginação */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 border-t">
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
                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
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
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da transação
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => {
                  const desc = e.target.value;
                  const autoFatura =
                    formData.tipo === 'despesa' &&
                    isFaturaByDescription(desc, 'despesa');
                  setFormData({
                    ...formData,
                    descricao: desc,
                    is_fatura: autoFatura ? true : formData.is_fatura,
                  });
                }}
                placeholder="Ex: Compra no supermercado"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoria */}
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.categoria_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoria_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((cat) => cat.tipo === formData.tipo)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Valor */}
              <div className="space-y-2">
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  value={formData.valor > 0 ? formData.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const value = parseInt(digits || '0', 10) / 100;
                    setFormData({ ...formData, valor: value });
                  }}
                  placeholder="0,00"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="andamento">Em Andamento</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Data da Transação */}
              <div className="space-y-2">
                <Label htmlFor="data_transacao">Data da Transação *</Label>
                <Input
                  id="data_transacao"
                  type="date"
                  value={formData.data_transacao}
                  onChange={(e) =>
                    setFormData({ ...formData, data_transacao: e.target.value })
                  }
                />
              </div>

              {/* Data de Vencimento */}
              <div className="space-y-2">
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vencimento: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Responsável */}
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel}
                  onChange={(e) =>
                    setFormData({ ...formData, responsavel: e.target.value })
                  }
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                <Input
                  id="forma_pagamento"
                  value={formData.forma_pagamento}
                  onChange={(e) =>
                    setFormData({ ...formData, forma_pagamento: e.target.value })
                  }
                  placeholder="Ex: Nubank, Santander..."
                />
              </div>
            </div>

            {/* Modalidade */}
            {formData.tipo === 'despesa' && (
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select
                  value={formData.modalidade_pagamento || ''}
                  onValueChange={(v) =>
                    setFormData({ ...formData, modalidade_pagamento: (v as any) || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="À vista ou Crédito?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vista">À Vista</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parcelado */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="parcelado"
                checked={formData.parcelado}
                onChange={(e) =>
                  setFormData({ ...formData, parcelado: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="parcelado">Compra parcelada?</Label>
            </div>

            {/* Fatura de Cartão */}
            {formData.tipo === 'despesa' && (
              <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_fatura"
                    checked={!!formData.is_fatura}
                    onChange={(e) =>
                      setFormData({ ...formData, is_fatura: e.target.checked })
                    }
                    className="h-4 w-4 accent-amber-600"
                  />
                  <Label htmlFor="is_fatura" className="flex items-center gap-1.5 cursor-pointer">
                    <CreditCard className="h-4 w-4 text-amber-600" />
                    <span>Pagamento de fatura de cartão de crédito</span>
                  </Label>
                </div>
                {formData.is_fatura && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 ml-6">
                    ⚠️ Este valor <strong>não será somado ao total de despesas</strong> do mês.
                    As transações individuais do cartão já estão contabilizadas, assim
                    evitamos a dupla contagem.
                  </p>
                )}
              </div>
            )}

            {formData.parcelado && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_parcelas">Total de Parcelas</Label>
                  <Input
                    id="total_parcelas"
                    type="number"
                    min="2"
                    value={formData.total_parcelas ?? 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_parcelas: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parcela_atual">Parcela Atual</Label>
                  <Input
                    id="parcela_atual"
                    type="number"
                    min="1"
                    max={formData.total_parcelas ?? 1}
                    value={(formData as any).parcela_atual ?? 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parcela_atual: Number(e.target.value),
                      } as any)
                    }
                    placeholder={`Ex: 1 de ${formData.total_parcelas ?? 1}`}
                  />
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                placeholder="Anotações adicionais..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTransaction} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Categoria */}
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCategoryCreated={() => {
          // Recarregar categorias após criar nova
          if (user) {
            getCategories(user.id).then(categoriesData => {
              if (categoriesData.data) {
                setCategories(categoriesData.data);
              }
            });
          }
        }}
        defaultType={formData.tipo}
      />

      {/* Modal de Editar Categorias */}
      <CategoryEditModal
        isOpen={categoryEditModalOpen}
        onClose={() => setCategoryEditModalOpen(false)}
        onChanged={() => {
          if (user) getCategories(user.id).then(r => { if (r.data) setCategories(r.data); });
        }}
      />
    </div>
  );
}
