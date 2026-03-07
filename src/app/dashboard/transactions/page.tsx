// ============================================
// Página: Transações
// Tabela completa de transações financeiras
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // inline editing state for spreadsheet-like table
  const [editingCell, setEditingCell] = useState<
    { id: string; field: keyof Transaction } | null
  >(null);
  const [editingValue, setEditingValue] = useState<any>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

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
    observacoes: '',
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
      observacoes: transaction.observacoes || '',
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

  return (
    <div className="space-y-4">
      {/* Barra de Controle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* Busca */}
        <div className="flex-1 max-w-sm">
          <Label htmlFor="search" className="text-xs text-muted-foreground mb-1 block">Buscar transações</Label>
          <Input
            id="search"
            placeholder="Descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="min-w-[140px]">
            <Label htmlFor="filter-type" className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
            <Select
              value={filters.tipo || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  tipo: value === 'all' ? undefined : (value as any),
                })
              }
            >
              <SelectTrigger id="filter-type" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Label htmlFor="filter-category" className="text-xs text-muted-foreground mb-1 block">Categoria</Label>
            <Select
              value={filters.categoria_id || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  categoria_id: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="filter-category" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Label htmlFor="filter-card" className="text-xs text-muted-foreground mb-1 block">Cartão</Label>
            <Select
              value={filters.forma_pagamento || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  forma_pagamento: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger id="filter-card" className="h-9 text-sm">
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

          <div className="min-w-[140px]">
            <Label htmlFor="filter-month" className="text-xs text-muted-foreground mb-1 block">Mês/Ano</Label>
            <Input
              id="filter-month"
              type="month"
              value={filters.mes || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  mes: e.target.value || undefined,
                })
              }
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={loading || transactions.length === 0}
            title="Excluir todas as transações"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleNewTransaction}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </div>
      </div>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transações</CardTitle>
              <CardDescription className="mt-1">
                {filteredTransactions.length} de {transactions.length}
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
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40 hover:bg-muted/40">
                    <th className="text-left py-3 px-6 font-medium text-sm">Descrição</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Tipo</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Categoria</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Cartão</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Valor</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Data</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
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
                          <span className="text-sm font-medium">{transaction.descricao}</span>
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
          )}
        </CardContent>
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
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
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
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: Number(e.target.value) })
                  }
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
                  placeholder="Ex: Cartão, Dinheiro..."
                />
              </div>
            </div>

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

            {formData.parcelado && (
              <div className="space-y-2">
                <Label htmlFor="total_parcelas">Número de Parcelas</Label>
                <Input
                  id="total_parcelas"
                  type="number"
                  min="2"
                  value={formData.total_parcelas}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_parcelas: Number(e.target.value),
                    })
                  }
                />
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
    </div>
  );
}
