'use client';

// ============================================
// Página: Lista de Desejos — Metas Financeiras com IA
// Poupe para uma viagem, compra específica, fundo de emergência...
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Target, Plus, Sparkles, Trash2, CheckCircle2, ChevronDown, ChevronUp,
  Loader2, TrendingUp, Calendar, Wallet, Star, X, Pencil,
} from 'lucide-react';
import {
  getWishlistGoals, createWishlistGoal, updateWishlistGoal,
  addAmountToGoal, deleteWishlistGoal, getAIGoalInsight,
} from '@/services/wishlist';
import { awardAchievement } from '@/services/social';
import type { WishlistGoal, WishlistGoalFormData } from '@/types';

const EMOJI_OPTIONS = ['🎯', '✈️', '🏠', '🚗', '📱', '💻', '👟', '📚', '🎓', '🏖️', '💍', '🎸', '🏋️', '🌍', '💰', '🏦', '🎮', '🛍️', '🍕', '🐶'];
const CATEGORIES = ['Geral', 'Viagem', 'Eletrônicos', 'Veículo', 'Imóvel', 'Educação', 'Saúde', 'Lazer', 'Roupa', 'Casa', 'Emergência', 'Investimento'];

interface GoalFormState {
  title: string;
  description: string;
  emoji: string;
  target_amount: string;
  current_amount: string;
  deadline: string;
  category: string;
}

const emptyForm: GoalFormState = {
  title: '', description: '', emoji: '🎯',
  target_amount: '', current_amount: '0',
  deadline: '', category: 'Geral',
};

export default function WishlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [goals, setGoals] = useState<WishlistGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GoalFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [depositValue, setDepositValue] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Dados financeiros para contexto da IA
  const [monthlyBalance, setMonthlyBalance] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getWishlistGoals(user.id);
    setGoals(data);

    // Busca saldo e gastos do mês atual para contexto da IA
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const { data: txs } = await supabase
      .from('transactions')
      .select('tipo, valor')
      .eq('user_id', user.id)
      .gte('data_transacao', start)
      .not('is_fatura', 'eq', true);

    if (txs) {
      const receita = (txs as any[]).filter(t => t.tipo === 'receita').reduce((s: number, t: any) => s + Number(t.valor), 0);
      const despesa = (txs as any[]).filter(t => t.tipo === 'despesa').reduce((s: number, t: any) => s + Number(t.valor), 0);
      setMonthlyBalance(receita - despesa);
      setMonthlyExpenses(despesa);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!user?.id || !form.title || !form.target_amount) return;
    setSaving(true);

    const payload: WishlistGoalFormData = {
      title: form.title,
      description: form.description || undefined,
      emoji: form.emoji,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || undefined,
      category: form.category,
    };

    if (editingId) {
      await updateWishlistGoal(editingId, payload);
      toast({ title: '✅ Meta atualizada!' });
    } else {
      const created = await createWishlistGoal(user.id, payload);
      if (created) {
        // Conquista: primeira meta
        if (goals.length === 0) await awardAchievement(user.id, 'wishlist-first');
        toast({ title: '🎯 Meta criada!', description: 'Boa sorte na jornada!' });
      }
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setSaving(false);
    await load();
  };

  const handleDeposit = async (goal: WishlistGoal) => {
    const val = parseFloat(depositValue[goal.id] ?? '0');
    if (!val || val <= 0) return;
    const updated = await addAmountToGoal(goal.id, goal.current_amount, val, goal.target_amount);
    if (updated?.completed && user?.id) {
      await awardAchievement(user.id, 'wishlist-done');
      toast({ title: '🏆 Parabéns! Meta atingida!', description: `Você conquistou "${goal.title}"!` });
    } else {
      toast({ title: `+R$${val.toFixed(2)} adicionado!` });
    }
    setDepositValue(prev => ({ ...prev, [goal.id]: '' }));
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteWishlistGoal(id);
    toast({ title: 'Meta removida.' });
    await load();
  };

  const handleEdit = (goal: WishlistGoal) => {
    setForm({
      title: goal.title,
      description: goal.description ?? '',
      emoji: goal.emoji,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline ?? '',
      category: goal.category,
    });
    setEditingId(goal.id);
    setShowForm(true);
  };

  const handleAIInsight = async (goal: WishlistGoal) => {
    setAiLoading(prev => ({ ...prev, [goal.id]: true }));
    const insight = await getAIGoalInsight(goal, monthlyBalance, monthlyExpenses);
    setAiResult(prev => ({ ...prev, [goal.id]: insight }));
    setAiLoading(prev => ({ ...prev, [goal.id]: false }));
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-7 w-7 text-emerald-500" />
            Lista de Desejos
          </h1>
          <p className="text-muted-foreground mt-1">
            Defina metas financeiras, acompanhe o progresso e deixe a IA te ajudar a chegar lá. ✨
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Meta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-emerald-500">{activeGoals.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Em andamento</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-amber-500">{completedGoals.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Concluídas</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-blue-500">
            {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">Progresso total</div>
        </Card>
      </div>

      {/* Formulário de criação/edição */}
      {showForm && (
        <Card className="border-emerald-300 dark:border-emerald-700 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{editingId ? '✏️ Editar Meta' : '🎯 Nova Meta'}</span>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Emoji */}
            <div>
              <label className="text-sm font-medium mb-2 block">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => setForm(p => ({ ...p, emoji: e }))}
                    className={`text-2xl p-1.5 rounded-lg border transition-all ${
                      form.emoji === e ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-transparent hover:border-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome da meta *</label>
                <Input
                  placeholder="Ex: Viagem para Paris"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição (opcional)</label>
              <Textarea
                placeholder="Por que essa meta é importante para você?"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Valor alvo (R$) *</label>
                <Input
                  type="number"
                  placeholder="5000"
                  min="0"
                  value={form.target_amount}
                  onChange={e => setForm(p => ({ ...p, target_amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Já guardei (R$)</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.current_amount}
                  onChange={e => setForm(p => ({ ...p, current_amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Prazo</label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!form.title || !form.target_amount || saving}
              onClick={handleSubmit}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {editingId ? 'Salvar alterações' : 'Criar Meta'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Metas em andamento */}
      {activeGoals.length === 0 && !showForm ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhuma meta ainda</p>
            <p className="text-sm mt-1">Crie sua primeira meta e comece a poupar com propósito!</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeira meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeGoals.map(goal => {
            const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const remaining = goal.target_amount - goal.current_amount;
            const isExpanded = expandedGoal === goal.id;

            let daysLeft: number | null = null;
            if (goal.deadline) {
              daysLeft = Math.ceil(
                (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
            }

            return (
              <Card key={goal.id} className="overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <CardContent className="pt-4 pb-4">
                  {/* Header da meta */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-2xl flex-shrink-0">
                      {goal.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-base">{goal.title}</p>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{goal.category}</span>
                            {daysLeft !== null && (
                              <span className={`text-xs flex items-center gap-1 ${daysLeft < 30 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                <Calendar className="h-3 w-3" />
                                {daysLeft > 0 ? `${daysLeft} dias` : 'Vencido'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleEdit(goal)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Barra de progresso */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            R$ {goal.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-muted-foreground">
                            Meta: R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-emerald-400' : 'bg-emerald-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Faltam: R$ {remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {/* Depositar */}
                    <div className="flex gap-1 flex-1 min-w-0">
                      <Input
                        type="number"
                        placeholder="R$ valor"
                        className="h-8 text-xs"
                        min="0"
                        value={depositValue[goal.id] ?? ''}
                        onChange={e => setDepositValue(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleDeposit(goal)}
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleDeposit(goal)}>
                        <Wallet className="h-3.5 w-3.5 mr-1" /> Guardar
                      </Button>
                    </div>

                    {/* IA */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      onClick={() => {
                        setExpandedGoal(isExpanded ? null : goal.id);
                        if (!aiResult[goal.id]) handleAIInsight(goal);
                      }}
                    >
                      {aiLoading[goal.id] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                      )}
                      Dica da IA
                      {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>

                  {/* Insight da IA expandido */}
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      {aiLoading[goal.id] ? (
                        <div className="flex items-center gap-2 text-purple-600 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analisando seus dados financeiros...
                        </div>
                      ) : (
                        <div className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-line leading-relaxed">
                          {aiResult[goal.id]}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Metas concluídas */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Metas alcançadas 🏆
          </h2>
          {completedGoals.map(goal => (
            <Card key={goal.id} className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 opacity-80">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{goal.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{goal.title}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ R$ {goal.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Concluída!
                    </p>
                  </div>
                  <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded text-muted-foreground hover:text-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
