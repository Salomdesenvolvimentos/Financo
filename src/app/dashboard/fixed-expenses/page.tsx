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
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Loader2,
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
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
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

      {/* Lista de Gastos */}
      <div className="grid gap-4">
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhum gasto fixo cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em &quot;Novo Gasto&quot; para começar
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{expense.descricao}</h3>
                      {!expense.ativo && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-danger">
                        {formatCurrency(expense.valor)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Vence dia {expense.dia_vencimento}
                      </span>
                      {expense.categoria && (
                        <span className="text-sm text-muted-foreground">
                          {expense.categoria.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(expense)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
