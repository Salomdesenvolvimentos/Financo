// ============================================
// FINACO - Página: Rendas Fixas
// Gerenciamento de rendas fixas mensais
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
  getFixedIncome,
  createFixedIncome,
  updateFixedIncome,
  deleteFixedIncome,
  validateFixedIncomeForm,
} from '@/services/fixed-income.local';
import { getCategories } from '@/services/categories.local';
import type { FixedIncome, FixedIncomeFormData, Category } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { CategoryModal } from '@/components/category-modal';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  AlertCircle,
  Loader2,
  Tag,
  ChevronDown,
  Pencil,
} from 'lucide-react';

export default function FixedIncomePage() {
  const { user } = useAuth();
  const [income, setIncome] = useState<FixedIncome[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<FixedIncome | null>(null);
  const [formData, setFormData] = useState<FixedIncomeFormData>({
    descricao: '',
    valor: 0,
    dia_recebimento: 1,
    tipo: 'salario',
    ativo: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Carregar dados
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      
      const [incomeResult, categoriesResult] = await Promise.all([
        getFixedIncome(user!.id),
        getCategories(user!.id),
      ]);
      
      if (incomeResult.data) {
        setIncome(incomeResult.data);
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
      dia_recebimento: 1,
      tipo: 'salario',
      ativo: true,
    });
    setFormErrors({});
    setEditingIncome(null);
  };

  // Abrir diálogo para criar/editar
  const openDialog = (incomeItem?: FixedIncome) => {
    if (incomeItem) {
      setFormData({
        descricao: incomeItem.descricao,
        valor: incomeItem.valor,
        dia_recebimento: incomeItem.dia_recebimento,
        tipo: incomeItem.tipo,
        ativo: incomeItem.ativo,
      });
      setEditingIncome(incomeItem);
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
    const validation = validateFixedIncomeForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      if (editingIncome) {
        // Atualizar
        const result = await updateFixedIncome(editingIncome.id, formData);
        if (result.error) {
          throw new Error(result.error);
        }
      } else {
        // Criar
        const result = await createFixedIncome(user!.id, formData);
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // Recarregar dados
      const result = await getFixedIncome(user!.id);
      if (result.data) {
        setIncome(result.data);
      }

      closeDialog();
    } catch (error: any) {
      console.error('Erro ao salvar renda fixa:', error);
      setFormErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Lidar com exclusão
  const handleDelete = async (incomeItem: FixedIncome) => {
    if (!confirm(`Tem certeza que deseja excluir "${incomeItem.descricao}"?`)) {
      return;
    }

    try {
      const result = await deleteFixedIncome(incomeItem.id);
      if (result.error) {
        throw new Error(result.error);
      }

      // Recarregar dados
      const reloadResult = await getFixedIncome(user!.id);
      if (reloadResult.data) {
        setIncome(reloadResult.data);
      }
    } catch (error: any) {
      console.error('Erro ao excluir renda fixa:', error);
      alert('Erro ao excluir renda fixa: ' + error.message);
    }
  };

  // Calcular totais por tipo
  const totalsByType = income.reduce((acc, item) => {
    if (!acc[item.tipo]) {
      acc[item.tipo] = { count: 0, total: 0 };
    }
    acc[item.tipo].count += 1;
    acc[item.tipo].total += item.valor;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const totalMonthly = income.reduce((sum, item) => sum + item.valor, 0);

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
          <h1 className="text-3xl font-bold">Rendas Fixas</h1>
          <p className="text-muted-foreground">
            Gerencie suas rendas mensais recorrentes (salário, adiantamentos, etc)
          </p>
        </div>

        <div className="flex gap-2 items-center">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Renda
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingIncome ? 'Editar Renda Fixa' : 'Nova Renda Fixa'}
                </DialogTitle>
                <DialogDescription>
                  {editingIncome 
                    ? 'Edite as informações da renda fixa.'
                    : 'Cadastre uma nova renda fixa mensal.'
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
                    placeholder="Ex: Salário da empresa"
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

                {/* Dia de Recebimento */}
                <div className="grid gap-2">
                  <Label htmlFor="dia_recebimento">Dia de Recebimento</Label>
                  <Select
                    value={formData.dia_recebimento.toString()}
                    onValueChange={(value) => setFormData({ ...formData, dia_recebimento: parseInt(value) })}
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
                  {formErrors.dia_recebimento && (
                    <p className="text-sm text-danger">{formErrors.dia_recebimento}</p>
                  )}
                </div>

                {/* Tipo */}
                <div className="grid gap-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: 'salario' | 'adiantamento' | 'outro') => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salario">Salário</SelectItem>
                      <SelectItem value="adiantamento">Adiantamento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.tipo && (
                    <p className="text-sm text-danger">{formErrors.tipo}</p>
                  )}
                </div>

                {/* Categoria */}
                <div className="grid gap-2">
                  <Label htmlFor="categoria_id">Categoria</Label>
                  <Select
                    value={(formData as any).categoria_id || ''}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value } as any)}
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
                  <Label htmlFor="ativo">Renda ativa</Label>
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
                    editingIncome ? 'Atualizar' : 'Cadastrar'
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
                <Link
                  href="/dashboard/settings"
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => setCategoryDropdownOpen(false)}
                >
                  <Pencil className="h-4 w-4" /> Editar Categorias
                </Link>
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              {income.length} renda{income.length !== 1 ? 's' : ''} ativa{income.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Salários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalsByType.salario?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalsByType.salario?.count || 0} salário{totalsByType.salario?.count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adiantamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(totalsByType.adiantamento?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalsByType.adiantamento?.count || 0} adiantamento{(totalsByType.adiantamento?.count || 0) !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Outras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(totalsByType.outro?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalsByType.outro?.count || 0} outra{(totalsByType.outro?.count || 0) !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Rendas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Rendas Cadastradas</CardTitle>
          <CardDescription>{income.length} renda{income.length !== 1 ? 's' : ''} no total</CardDescription>
        </CardHeader>
        <CardContent>
          {income.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <DollarSign className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Nenhuma renda fixa cadastrada</p>
              <p className="text-sm mt-1">Clique em &quot;Nova Renda&quot; para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-6 font-medium text-sm">Descrição</th>
                    <th className="text-left py-3 px-6 font-medium text-sm">Tipo</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Recebimento</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Valor</th>
                    <th className="text-center py-3 px-6 font-medium text-sm">Status</th>
                    <th className="text-right py-3 px-6 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {income.map((incomeItem) => (
                    <tr key={incomeItem.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-6">
                        <span className="text-sm font-medium">{incomeItem.descricao}</span>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          incomeItem.tipo === 'salario' ? 'bg-primary/10 text-primary' :
                          incomeItem.tipo === 'adiantamento' ? 'bg-warning/10 text-warning' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {incomeItem.tipo === 'salario' ? 'Salário' :
                           incomeItem.tipo === 'adiantamento' ? 'Adiantamento' : 'Outro'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          Dia {incomeItem.dia_recebimento}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="text-sm font-semibold text-success">
                          {formatCurrency(incomeItem.valor)}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          incomeItem.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {incomeItem.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(incomeItem)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(incomeItem)}>
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
        defaultType="receita"
      />
    </div>
  );
}
