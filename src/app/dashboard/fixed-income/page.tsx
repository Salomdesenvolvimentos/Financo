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
import type { FixedIncome, FixedIncomeFormData } from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function FixedIncomePage() {
  const { user } = useAuth();
  const [income, setIncome] = useState<FixedIncome[]>([]);
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

  // Carregar dados
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      
      const result = await getFixedIncome(user!.id);
      
      if (result.data) {
        setIncome(result.data);
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

      {/* Lista de Rendas */}
      <div className="grid gap-4">
        {income.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma renda fixa cadastrada</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Nova Renda" para começar
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          income.map((incomeItem) => (
            <Card key={incomeItem.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{incomeItem.descricao}</h3>
                      {!incomeItem.ativo && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                          Inativo
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded ${
                        incomeItem.tipo === 'salario' ? 'bg-primary/10 text-primary' :
                        incomeItem.tipo === 'adiantamento' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {incomeItem.tipo === 'salario' ? 'Salário' :
                         incomeItem.tipo === 'adiantamento' ? 'Adiantamento' :
                         'Outro'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-bold text-success">
                        {formatCurrency(incomeItem.valor)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Recebe dia {incomeItem.dia_recebimento}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(incomeItem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(incomeItem)}
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
