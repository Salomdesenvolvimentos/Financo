// ============================================
// FINACO - Página: Cartões de Crédito e Faturas
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  getCreditCards, createCreditCard, updateCreditCard, deleteCreditCard,
  getInvoice, getMelhorDiaCompra, getDiasExtraPrazo,
} from '@/services/credit-cards.local';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { CreditCard, CreditCardFormData, Invoice } from '@/types';
import {
  Plus, CreditCard as CreditCardIcon, Trash2, Edit, Loader2,
  AlertCircle, Calendar, TrendingDown, ChevronLeft, ChevronRight,
  Lightbulb, Star,
} from 'lucide-react';

const CARD_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#3B82F6', '#1F2937',
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const emptyForm: CreditCardFormData = {
  nome: '',
  banco: '',
  limite: 0,
  dia_fechamento: 7,
  dia_vencimento: 15,
  cor: '#6366F1',
};

export default function CreditCardsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formData, setFormData] = useState<CreditCardFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fatura selecionada
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date());
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const result = await getCreditCards(user.id);
    if (result.data) {
      setCards(result.data);
      if (result.data.length > 0 && !selectedCardId) {
        setSelectedCardId(result.data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!selectedCardId || !user?.id) return;
    setLoadingInvoice(true);
    getInvoice(user.id, selectedCardId, invoiceDate.getFullYear(), invoiceDate.getMonth() + 1)
      .then((r) => {
        if (r.data) setInvoice(r.data);
        else setInvoice(null);
      })
      .finally(() => setLoadingInvoice(false));
  }, [selectedCardId, invoiceDate, user?.id]);

  const validate = (data: CreditCardFormData) => {
    const e: Record<string, string> = {};
    if (!data.nome.trim()) e.nome = 'Nome obrigatório';
    if (data.limite <= 0) e.limite = 'Limite deve ser maior que zero';
    if (data.dia_fechamento < 1 || data.dia_fechamento > 31) e.dia_fechamento = 'Dia inválido';
    if (data.dia_vencimento < 1 || data.dia_vencimento > 31) e.dia_vencimento = 'Dia inválido';
    return e;
  };

  const openDialog = (card?: CreditCard) => {
    if (card) {
      setFormData({
        nome: card.nome, banco: card.banco || '', limite: card.limite,
        dia_fechamento: card.dia_fechamento, dia_vencimento: card.dia_vencimento,
        cor: card.cor || '#6366F1',
      });
      setEditingCard(card);
    } else {
      setFormData(emptyForm);
      setEditingCard(null);
    }
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate(formData);
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    setSubmitting(true);
    try {
      if (editingCard) {
        const r = await updateCreditCard(editingCard.id, formData);
        if (r.error) throw new Error(r.error);
        toast({ title: 'Cartão atualizado!' });
      } else {
        const r = await createCreditCard(user!.id, formData);
        if (r.error) throw new Error(r.error);
        toast({ title: 'Cartão cadastrado!' });
      }
      await load();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (card: CreditCard) => {
    if (!confirm(`Excluir "${card.nome}"?`)) return;
    const r = await deleteCreditCard(card.id);
    if (r.error) {
      toast({ title: 'Erro ao excluir', description: r.error, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão removido' });
      await load();
    }
  };

  const prevMonth = () => setInvoiceDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setInvoiceDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedCard = cards.find(c => c.id === selectedCardId);
  const usedLimit = invoice?.total ?? 0;
  const usedPct = selectedCard ? Math.min(100, (usedLimit / selectedCard.limite) * 100) : 0;

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
          <h1 className="text-3xl font-bold">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e acompanhe suas faturas</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
                <DialogDescription>
                  {editingCard ? 'Edite as informações do cartão.' : 'Cadastre um novo cartão de crédito.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome do Cartão *</Label>
                  <Input id="nome" value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Nubank, Santander..." />
                  {errors.nome && <p className="text-sm text-danger">{errors.nome}</p>}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="banco">Banco (opcional)</Label>
                  <Input id="banco" value={formData.banco ?? ''}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    placeholder="Ex: Nubank, Itaú..." />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="limite">Limite *</Label>
                  <Input id="limite"
                    value={formData.limite > 0 ? formData.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const value = parseInt(digits || '0', 10) / 100;
                      setFormData({ ...formData, limite: value });
                    }}
                    placeholder="0,00" />
                  {errors.limite && <p className="text-sm text-danger">{errors.limite}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Dia de Fechamento</Label>
                    <Select value={formData.dia_fechamento.toString()}
                      onValueChange={(v) => setFormData({ ...formData, dia_fechamento: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dia_fechamento && <p className="text-sm text-danger">{errors.dia_fechamento}</p>}
                  </div>

                  <div className="grid gap-2">
                    <Label>Dia de Vencimento</Label>
                    <Select value={formData.dia_vencimento.toString()}
                      onValueChange={(v) => setFormData({ ...formData, dia_vencimento: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <SelectItem key={d} value={d.toString()}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.dia_vencimento && <p className="text-sm text-danger">{errors.dia_vencimento}</p>}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Cor do Cartão</Label>
                  <div className="flex gap-2 flex-wrap">
                    {CARD_COLORS.map(color => (
                      <button key={color} type="button"
                        onClick={() => setFormData({ ...formData, cor: color })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${formData.cor === color ? 'border-primary scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }} />
                    ))}
                    <input type="color" value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-7 h-7 rounded-full cursor-pointer border" />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : (editingCard ? 'Atualizar' : 'Cadastrar')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de cartões */}
      {cards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CreditCardIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhum cartão cadastrado</p>
            <p className="text-sm mt-1">Clique em &quot;Novo Cartão&quot; para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => {
            const melhorDia = getMelhorDiaCompra(card.dia_fechamento);
            const diasPrazo = getDiasExtraPrazo(card.dia_fechamento, card.dia_vencimento);
            return (
              <Card key={card.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedCardId === card.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedCardId(card.id)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: card.cor || '#6366F1' }}>
                        <CreditCardIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{card.nome}</p>
                        {card.banco && <p className="text-xs text-muted-foreground">{card.banco}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); openDialog(card); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(card); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Limite</span>
                      <span className="font-medium text-foreground">{formatCurrency(card.limite)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fecha dia {card.dia_fechamento} · Vence dia {card.dia_vencimento}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-2">
                      <Lightbulb className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Melhor dia para comprar: dia <strong>{melhorDia}</strong> (+{diasPrazo} dias)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Fatura do cartão selecionado */}
      {selectedCard && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedCard.cor || '#6366F1' }} />
                  Fatura — {selectedCard.nome}
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {MONTH_NAMES[invoiceDate.getMonth()]} de {invoiceDate.getFullYear()}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[130px] text-center">
                  {MONTH_NAMES[invoiceDate.getMonth()]} {invoiceDate.getFullYear()}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Barra de limite */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Limite usado nesta fatura</span>
                <span className={`font-semibold ${usedPct >= 80 ? 'text-danger' : usedPct >= 50 ? 'text-warning' : 'text-foreground'}`}>
                  {usedPct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usedPct >= 80 ? 'bg-danger' : usedPct >= 50 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Usado: {formatCurrency(usedLimit)}</span>
                <span>Disponível: {formatCurrency(Math.max(0, selectedCard.limite - usedLimit))}</span>
              </div>
            </div>

            {/* Vencimento */}
            {invoice && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Vencimento: <strong className="text-foreground">{formatDate(invoice.vencimento)}</strong></span>
              </div>
            )}

            {/* Itens da fatura */}
            {loadingInvoice ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !invoice || invoice.itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma transação nesta fatura</p>
                <p className="text-xs mt-1">
                  Ao criar uma transação, selecione este cartão para ela aparecer aqui.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left py-2.5 px-6 font-medium text-sm">Descrição</th>
                      <th className="text-left py-2.5 px-6 font-medium text-sm">Categoria</th>
                      <th className="text-left py-2.5 px-6 font-medium text-sm">Data</th>
                      <th className="text-right py-2.5 px-6 font-medium text-sm">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.itens.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-6">
                          <span className="text-sm font-medium">{item.descricao}</span>
                          {item.total_parcelas && item.total_parcelas > 1 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({item.parcela_atual}/{item.total_parcelas})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-6">
                          {item.categoria ? (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${item.categoria.cor}20`, color: item.categoria.cor }}>
                              {item.categoria.nome}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-6">
                          <span className="text-sm text-muted-foreground">{formatDate(item.data_transacao)}</span>
                        </td>
                        <td className="py-2.5 px-6 text-right">
                          <span className="text-sm font-semibold text-danger">{formatCurrency(item.valor)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20">
                      <td colSpan={3} className="py-3 px-6 font-semibold text-sm text-right">Total da Fatura</td>
                      <td className="py-3 px-6 text-right font-bold text-danger text-base">{formatCurrency(invoice.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Alerta de limite */}
            {usedPct >= 80 && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
                <p className="text-sm text-danger">
                  ⚠️ Você usou {usedPct.toFixed(0)}% do limite deste cartão nesta fatura.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dica de uso */}
      {selectedCard && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Star className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Melhor dia para comprar no {selectedCard.nome}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                  Compras feitas no dia <strong>{getMelhorDiaCompra(selectedCard.dia_fechamento)}</strong> ou depois
                  têm até <strong>{getDiasExtraPrazo(selectedCard.dia_fechamento, selectedCard.dia_vencimento)} dias</strong> para pagar —
                  o maior prazo possível!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
