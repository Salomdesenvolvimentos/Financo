// ============================================
// Página: Desafios de Poupança (Gamificação)
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Flame, CheckCircle, Plus, RotateCcw, Loader2 } from 'lucide-react';

interface Challenge {
  id: string;          // Supabase UUID
  challenge_id: string;
  title: string;
  description: string;
  emoji: string;
  target: number;
  category: string;
  progress: number;
  completed: boolean;
  started_at?: string;
}

const PRESET_CHALLENGES: Omit<Challenge, 'id' | 'progress' | 'completed' | 'started_at'>[] = [
  {
    challenge_id: 'no-delivery',
    title: 'Mês Sem Delivery',
    description: 'Passe um mês inteiro sem pedir comida por aplicativo. Cozinhe em casa!',
    emoji: '🍳',
    target: 30,
    category: 'Alimentação',
  },
  {
    challenge_id: '52-weeks',
    title: 'Desafio das 52 Semanas',
    description: 'Na semana 1 poupe R$10, semana 2 R$20... ao final do ano terá R$13.780!',
    emoji: '💰',
    target: 13780,
    category: 'Poupança',
  },
  {
    challenge_id: 'no-impulse',
    title: 'Sem Compras por Impulso',
    description: 'Antes de qualquer compra acima de R$50, espere 48h. Se ainda quiser, compre.',
    emoji: '🛑',
    target: 30,
    category: 'Consumo',
  },
  {
    challenge_id: 'coffee-savings',
    title: 'Desafio do Café em Casa',
    description: 'Prepare seu café em casa por 30 dias. Economize até R$200/mês.',
    emoji: '☕',
    target: 200,
    category: 'Alimentação',
  },
  {
    challenge_id: 'transport-save',
    title: 'Menos Uber',
    description: 'Use transporte público ou caminhe pelo menos 3x por semana este mês.',
    emoji: '🚌',
    target: 30,
    category: 'Transporte',
  },
  {
    challenge_id: 'streaming-audit',
    title: 'Auditoria de Streaming',
    description: 'Cancele pelo menos 1 serviço de streaming que você usa pouco.',
    emoji: '📺',
    target: 1,
    category: 'Lazer',
  },
];

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load from Supabase
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setChallenges(data as Challenge[]);
        setLoading(false);
      });
  }, [user?.id]);

  const addChallenge = async (preset: typeof PRESET_CHALLENGES[0]) => {
    if (!user?.id || challenges.find(c => c.challenge_id === preset.challenge_id)) return;
    setSaving(true);
    const row = {
      user_id: user.id,
      challenge_id: preset.challenge_id,
      title: preset.title,
      description: preset.description,
      emoji: preset.emoji,
      target: preset.target,
      category: preset.category,
      progress: 0,
      completed: false,
      started_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('challenges').insert(row).select().single();
    if (!error && data) setChallenges(prev => [...prev, data as Challenge]);
    setSaving(false);
  };

  const updateProgress = async (id: string, delta: number) => {
    const ch = challenges.find(c => c.id === id);
    if (!ch) return;
    const newProgress = Math.min(ch.target, Math.max(0, ch.progress + delta));
    const completed = newProgress >= ch.target;
    const { data, error } = await supabase
      .from('challenges')
      .update({ progress: newProgress, completed })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setChallenges(prev => prev.map(c => c.id === id ? (data as Challenge) : c));
    }
  };

  const removeChallenge = async (id: string) => {
    await supabase.from('challenges').delete().eq('id', id);
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  const activeChallenges = challenges.filter(c => !c.completed);
  const completedChallenges = challenges.filter(c => c.completed);
  const availablePresets = PRESET_CHALLENGES.filter(p => !challenges.find(c => c.challenge_id === p.challenge_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-500" />
          Desafios de Poupança
        </h1>
        <p className="text-muted-foreground mt-1">Transforme economia em conquistas. Aceite desafios e acompanhe seu progresso.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-primary">{activeChallenges.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Em andamento</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-green-500">{completedChallenges.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Concluídos</div>
        </Card>
        <Card className="text-center py-4">
          <div className="text-2xl font-bold text-amber-500">{completedChallenges.length * 10}</div>
          <div className="text-xs text-muted-foreground mt-1">Pontos ganhos</div>
        </Card>
      </div>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Em Andamento
          </h2>
          {activeChallenges.map(ch => {
            const pct = Math.round((ch.progress / ch.target) * 100);
            return (
              <Card key={ch.id} className="border-primary/20">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{ch.emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{ch.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progresso</span>
                            <span>{ch.progress} / {ch.target} {ch.category === 'Poupança' ? 'R$' : 'dias'}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-right text-muted-foreground">{pct}%</p>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => updateProgress(ch.id, 1)}>
                            +1 dia
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => updateProgress(ch.id, 7)}>
                            +1 semana
                          </Button>
                          {ch.category === 'Poupança' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => updateProgress(ch.id, 10)}>
                              +R$10
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-muted-foreground h-7 px-2" onClick={() => removeChallenge(ch.id)}>
                      ✕
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completedChallenges.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Concluídos 🎉
          </h2>
          {completedChallenges.map(ch => (
            <Card key={ch.id} className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ch.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{ch.title}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Desafio concluído! +10 pontos</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-muted-foreground h-7 px-2" onClick={() => removeChallenge(ch.id)}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Available Presets */}
      {availablePresets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Desafios Disponíveis
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availablePresets.map(p => (
              <Card key={p.challenge_id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => addChallenge(p)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-primary">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Nenhum desafio ativo</p>
          <p className="text-sm mt-1">Escolha um desafio acima para começar!</p>
        </div>
      )}
    </div>
  );
}
