// ============================================
// Service: Wishlist / Metas Financeiras
// ============================================

import { supabase } from '@/lib/supabase';
import type { WishlistGoal, WishlistGoalFormData } from '@/types';
import { apiUrl } from '@/lib/api-url';

export async function getWishlistGoals(userId: string): Promise<WishlistGoal[]> {
  const { data } = await supabase
    .from('wishlist_goals')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  return (data as WishlistGoal[]) ?? [];
}

export async function createWishlistGoal(
  userId: string,
  form: WishlistGoalFormData
): Promise<WishlistGoal | null> {
  const { data } = await supabase
    .from('wishlist_goals')
    .insert({
      user_id: userId,
      title: form.title,
      description: form.description,
      emoji: form.emoji,
      target_amount: form.target_amount,
      current_amount: form.current_amount ?? 0,
      deadline: form.deadline || null,
      category: form.category,
      priority: form.priority ?? 0,
      completed: false,
    })
    .select()
    .single();
  return data as WishlistGoal | null;
}

export async function updateWishlistGoal(
  goalId: string,
  fields: Partial<WishlistGoal>
): Promise<WishlistGoal | null> {
  const { data } = await supabase
    .from('wishlist_goals')
    .update(fields)
    .eq('id', goalId)
    .select()
    .single();
  return data as WishlistGoal | null;
}

export async function addAmountToGoal(
  goalId: string,
  currentAmount: number,
  addAmount: number,
  targetAmount: number
): Promise<WishlistGoal | null> {
  const newAmount = Math.min(targetAmount, currentAmount + addAmount);
  const completed = newAmount >= targetAmount;
  return updateWishlistGoal(goalId, { current_amount: newAmount, completed });
}

export async function deleteWishlistGoal(goalId: string): Promise<void> {
  await supabase.from('wishlist_goals').delete().eq('id', goalId);
}

// Gera insight da IA para uma meta específica
export async function getAIGoalInsight(
  goal: WishlistGoal,
  monthlyBalance: number,
  monthlyExpenses: number
): Promise<string> {
  const remaining = goal.target_amount - goal.current_amount;
  const pct = Math.round((goal.current_amount / goal.target_amount) * 100);

  let deadlineInfo = '';
  if (goal.deadline) {
    const daysLeft = Math.ceil(
      (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    deadlineInfo = `Prazo: ${daysLeft} dias restantes (${goal.deadline}).`;
  }

  const prompt = `
Você é um consultor financeiro pessoal amigável chamado Financo AI.
Analise esta meta do usuário e dê dicas práticas e motivadoras em português.

Meta: "${goal.title}"
Categoria: ${goal.category}
Valor alvo: R$ ${goal.target_amount.toFixed(2)}
Valor atual: R$ ${goal.current_amount.toFixed(2)} (${pct}% concluído)
Faltam: R$ ${remaining.toFixed(2)}
${deadlineInfo}

Contexto financeiro atual do usuário:
- Saldo mensal disponível: R$ ${monthlyBalance.toFixed(2)}
- Gastos mensais: R$ ${monthlyExpenses.toFixed(2)}

Com base nisso:
1. Diga em quantos meses consegue atingir a meta guardando X% do saldo
2. Dê 2-3 dicas práticas e específicas para atingir essa meta mais rápido
3. Use emojis para deixar a resposta amigável
Seja conciso (máx 150 palavras).
`.trim();

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(apiUrl('/api/ai'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        systemPrompt: 'Você é Financo AI, um consultor financeiro amigável e prático.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error();
    const json = await res.json();
    return json.content as string;
  } catch {
    // Fallback sem API
    const monthsNeeded =
      monthlyBalance > 0 ? Math.ceil(remaining / (monthlyBalance * 0.2)) : 0;
    return `💡 Com seu saldo atual, guardando ~20% por mês, você pode atingir **${goal.title}** em aproximadamente **${monthsNeeded} ${monthsNeeded === 1 ? 'mês' : 'meses'}**!\n\n✅ Dica: revise assinaturas e reduza gastos com lazer para acelerar a meta.\n🎯 Progresso atual: ${pct}% — continue assim!`;
  }
}
