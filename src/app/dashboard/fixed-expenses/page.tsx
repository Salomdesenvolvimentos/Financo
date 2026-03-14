// ============================================
// FINACO - Página: Gastos Fixos
// Gerenciamento de gastos fixos mensais
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  getFixedExpenses,
  createFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
  validateFixedExpenseForm,
} from '@/services/fixed-expenses.local';
import { getCategories } from '@/services/categories.local';
import type { FixedExpense, FixedExpenseFormData, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryModal } from '@/components/category-modal';
import { CategoryEditModal } from '@/components/category-edit-modal';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tag,
  ChevronDown,
  Pencil,
} from 'lucide-react';

export default function FixedExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [formData, setFormData] = useState<FixedExpenseFormData>({
    descricao: '',
    valor: 0,
    dia_vencimento: 1,
    categoria_id: '',
    ativo: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryEditModalOpen, setCategoryEditModalOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      
      const [expensesResult, categoriesResult] = await Promise.all([
        getFixedExpenses(user?.id || ''),
        getCategories(user?.id || ''),
      ]);

      if (expensesResult.data) {
        setExpenses(expensesResult.data);
      }
      
      if (categoriesResult.data) {
        setCategories(categoriesResult.data);
      }

      setLoading(false);
    }

    loadData();
  }, [user]);

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: 0,
      dia_vencimento: 1,
      categoria_id: '',
      ativo: true,
    });
    setFormErrors({});
    setEditingExpense(null);
  };

  // Abrir diálogo para criar/editar
  const openDialog = (expense?: FixedExpense) => {
    if (expense) {
      setFormData({
        descricao: expense.descricao,
        valor: expense.valor,
        dia_vencimento: expense.dia_vencimento,
        categoria_id: expense.categoria_id || '',
        ativo: expense.ativo,
      });
      setEditingExpense(expense);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // Fechar diálogo
  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // Lidar com envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário
    const validation = validateFixedExpenseForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingExpense) {
        // Atualizar
        const result = await updateFixedExpense(editingExpense.id, formData);
        if (result.error) {
          throw new Error(result.error);
        }
      } else {
        // Criar
        const result = await createFixedExpense(user!.id, formData);
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // Recarregar dados
      const reloadResult = await getFixedExpenses(user!.id);
      if (reloadResult.data) {
        setExpenses(reloadResult.data);
      }

      closeDialog();
    } catch (error: any) {
      console.error('Erro ao salvar gasto fixo:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Lidar com exclusão
  const handleDelete = async (expense: FixedExpense) => {
    if (!confirm(`Tem certeza que deseja excluir "${expense.descricao}"?`)) {
      return;
    }

    try {
      const result = await deleteFixedExpense(expense.id);
      if (result.error) {
        throw new Error(result.error);
      }

      // Recarregar dados
      const reloadResult = await getFixedExpenses(user!.id);
      if (reloadResult.data) {
        setExpenses(reloadResult.data);
      }
    } catch (error: any) {
      console.error('Erro ao excluir gasto fixo:', error);
      alert('Erro ao excluir gasto fixo: ' + error.message);
    }
  };

  // Calcular total mensal
  const totalMonthly = expenses.reduce((sum, expense) => sum + expense.valor, 0);
  const totalPages = Math.max(1, Math.ceil(expenses.length / rowsPerPage));
  const paginated = expenses.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

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
          <h1 className="text-3xl font-bold">Gastos Fixos</h1>
          <p className="text-muted-foreground">
            Gerencie suas contas e despesas mensais recorrentes
          </p>
        </div>

        <div className="flex gap-2 items-center">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? 'Editar Gasto Fixo' : 'Novo Gasto Fixo'}
                </DialogTitle>
                <DialogDescription>
                  {editingExpense 
                    ? 'Edite as informações do gasto fixo.'
                    : 'Cadastre um novo gasto fixo mensal.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Descrição */}
                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Conta de luz"
                  />
                  {formErrors.descricao && (
                    <p className="text-sm text-danger">{formErrors.descricao}</p>
                  )}
                </div>

                {/* Valor */}
                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor</Label>
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
                  {formErrors.valor && (
                    <p className="text-sm text-danger">{formErrors.valor}</p>
                  )}
                </div>

                {/* Dia de Vencimento */}
                <div className="grid gap-2">
                  <Label htmlFor="dia_vencimento">Dia de Vencimento</Label>
                  <Select
                    value={formData.dia_vencimento.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dia_vencimento: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.dia_vencimento && (
                    <p className="text-sm text-danger">{formErrors.dia_vencimento}</p>
                  )}
                </div>

                {/* Categoria */}
                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Categoria</Label>
                  <Select
                    value={formData.categoria_id}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.categoria_id && (
                    <p className="text-sm text-danger">{formErrors.categoria_id}</p>
                  )}
                </div>

                {/* Ativo */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="ativo">Gasto ativo</Label>
                </div>

                {/* Erro geral */}
                {formErrors.submit && (
                  <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger rounded-lg">
                    <AlertCircle className="h-4 w-4 text-danger" />
                    <p className="text-sm text-danger">{formErrors.submit}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    editingExpense ? 'Atualizar' : 'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Categoria dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setCategoryDropdownOpen((v) => !v)}
          >
            <Tag className="h-4 w-4" />
            Categoria
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
      </div>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Mensal</CardTitle>
          <CardDescription>
            Total de gastos fixos ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-danger">
            {formatCurrency(totalMonthly)}
          </div>
          <p className="text-sm text-muted-foreground">
            {expenses.length} gasto{expenses.length !== 1 ? 's' : ''} cadastrado{expenses.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Tabela de Gastos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Gastos Cadastrados</CardTitle>
          <CardDescription>{expenses.length} gasto{expenses.length !== 1 ? 's' : ''} no total</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Calendar className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Nenhum gasto fixo cadastrado</p>
              <p className="text-sm mt-1">Clique em &quot;Novo Gasto&quot; para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-6 font-medium text-sm">Descrição</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Categoria</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Vencimento</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Valor</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6">
                        <span className="text-sm font-medium">{expense.descricao}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-sm text-muted-foreground">
                          {expense.categoria?.nome || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Dia {expense.dia_vencimento}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="text-sm font-semibold text-danger">
                          {formatCurrency(expense.valor)}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          expense.ativo
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {expense.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(expense)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Paginação */}
          {expenses.length > 0 && (
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
                  {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, expenses.length)} de {expenses.length}
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
      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onCategoryCreated={() => {
          if (user) {
            getCategories(user.id).then((r) => {
              if (r.data) setCategories(r.data);
            });
          }
        }}
        defaultType="despesa"
      />
      <CategoryEditModal
        isOpen={categoryEditModalOpen}
        onClose={() => setCategoryEditModalOpen(false)}
        onChanged={() => {
          if (user) getCategories(user.id).then(r => { if (r.data) setCategories(r.data); });
        }}
        defaultType="despesa"
      />
    </div>
  );
}
