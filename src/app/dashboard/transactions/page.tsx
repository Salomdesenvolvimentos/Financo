// ============================================
// Página: Transações
// Tabela completa de transações financeiras
// ============================================

'use client';

import { useState, useEffect } from 'react';
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
  Filter,
  Edit,
  Trash2,
  Loader2,
  Download,
} from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

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
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);

      const [transactionsData, categoriesData] = await Promise.all([
        getTransactions(filters),
        getCategories(user.id),
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

  // Abrir dialog para nova transação
  const handleNewTransaction = () => {
    setEditingTransaction(null);
    setFormData({
      descricao: '',
      tipo: 'despesa',
      categoria_id: '',
      responsavel: user?.user_metadata?.nome || '',
      status: 'andamento',
      valor: 0,
      data_transacao: formatDateISO(new Date()),
      data_vencimento: '',
      forma_pagamento: '',
      parcelado: false,
      total_parcelas: 1,
      observacoes: '',
    });
    setDialogOpen(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transações</h1>
          <p className="text-muted-foreground">
            Gerencie suas receitas e despesas
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleDeleteAll}
            variant="destructive"
            disabled={loading || transactions.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Todas
          </Button>
          
          <Button onClick={handleNewTransaction}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Busca */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.tipo || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    tipo: value === 'all' ? undefined : (value as any),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === 'all' ? undefined : (value as any),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="andamento">Em Andamento</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={filters.categoria_id || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    categoria_id: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Listagem</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Descrição</th>
                    <th className="text-left py-3 px-2">Tipo</th>
                    <th className="text-left py-3 px-2">Categoria</th>
                    <th className="text-right py-3 px-2">Valor</th>
                    <th className="text-left py-3 px-2">Data</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">{transaction.descricao}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.tipo === 'receita'
                              ? 'bg-success/10 text-success'
                              : 'bg-danger/10 text-danger'
                          }`}
                        >
                          {transaction.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {transaction.categoria?.nome || '-'}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {formatCurrency(Number(transaction.valor))}
                      </td>
                      <td className="py-3 px-2">
                        {formatDate(transaction.data_transacao)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
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
