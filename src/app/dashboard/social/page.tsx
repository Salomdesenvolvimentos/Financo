'use client';

// ============================================
// Página: Social Hub — Amigos, Conquistas e Desafios em Dupla
// Inspirado no Duolingo, mas para finanças!
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, Trophy, Swords, Search, UserPlus, Check, X, Clock,
  Star, ChevronRight, Medal, Flame, Crown, Loader2, Send,
  UserCheck, UserX, RotateCcw, RefreshCw,
} from 'lucide-react';
import {
  getMyProfile, upsertProfile, searchProfilesByEmail,
  getMyFriendships, sendFriendRequest, respondFriendRequest, removeFriend,
  getAllAchievementDefinitions, getMyAchievements, getFriendsAchievements,
  getMyDuoChallenges, createDuoChallenge, respondDuoChallenge, updateDuoProgress,
  awardAchievement,
} from '@/services/social';
import { supabase } from '@/lib/supabase';
import type {
  Profile, Friendship, UserAchievement, AchievementDefinition, DuoChallenge,
} from '@/types';

// Desafios disponíveis para duelo
const DUO_PRESETS = [
  { challenge_id: 'no-delivery', title: 'Mês Sem Delivery',         emoji: '🍳', target: 30, category: 'Alimentação', description: 'Passe um mês inteiro sem pedir comida por aplicativo.' },
  { challenge_id: 'no-impulse',  title: 'Sem Compras por Impulso',  emoji: '🛑', target: 30, category: 'Consumo',      description: 'Espere 48h antes de qualquer compra acima de R$50.' },
  { challenge_id: 'coffee-home', title: 'Café em Casa',             emoji: '☕', target: 30, category: 'Alimentação', description: 'Prepare seu café em casa por 30 dias.' },
  { challenge_id: 'transport',   title: 'Menos Uber',               emoji: '🚌', target: 30, category: 'Transporte',  description: 'Use transporte público 3x/semana por 1 mês.' },
  { challenge_id: 'savings-100', title: 'Poupança de R$100',        emoji: '💰', target: 100, category: 'Poupança',   description: 'Juntem R$100 cada um esse mês.' },
  { challenge_id: 'investment',  title: 'Faça um Investimento',     emoji: '📈', target: 1, category: 'Investimentos', description: 'Invistam qualquer valor em algum ativo.' },
];

type Tab = 'friends' | 'achievements' | 'duels';

export default function SocialPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('friends');
  const [loading, setLoading] = useState(true);

  // Dados
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [myAchievements, setMyAchievements] = useState<UserAchievement[]>([]);
  const [allDefinitions, setAllDefinitions] = useState<AchievementDefinition[]>([]);
  const [friendsAchievements, setFriendsAchievements] = useState<UserAchievement[]>([]);
  const [duoChallenges, setDuoChallenges] = useState<DuoChallenge[]>([]);

  // UI states
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreateDuo, setShowCreateDuo] = useState(false);
  const [selectedFriendForDuo, setSelectedFriendForDuo] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<typeof DUO_PRESETS[0] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [profile, ships, myAch, defs, duos] = await Promise.all([
      getMyProfile(user.id),
      getMyFriendships(user.id),
      getMyAchievements(user.id),
      getAllAchievementDefinitions(),
      getMyDuoChallenges(user.id),
    ]);
    setMyProfile(profile);
    setFriendships(ships);
    setMyAchievements(myAch);
    setAllDefinitions(defs);
    setDuoChallenges(duos);

    // Feed de conquistas dos amigos aceitos
    const acceptedFriendIds = ships
      .filter(f => f.status === 'accepted')
      .map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    if (acceptedFriendIds.length > 0) {
      const feed = await getFriendsAchievements(acceptedFriendIds);
      setFriendsAchievements(feed);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Subscription em tempo real para pedidos de amizade e desafios
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`social-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${user.id}` },
        () => { load(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'duo_challenges', filter: `addressee_id=eq.${user.id}` },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  // Garantir que o perfil existe
  useEffect(() => {
    if (user?.id && !myProfile) {
      const displayName = (user as any).user_metadata?.nome ?? user.email?.split('@')[0] ?? 'Usuário';
      upsertProfile(user.id, { display_name: displayName, email: user.email });
    }
  }, [user, myProfile]);

  // ---- Amigos ------------------------------------------------
  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const pendingReceived = friendships.filter(
    f => f.status === 'pending' && f.addressee_id === user?.id
  );
  const pendingSent = friendships.filter(
    f => f.status === 'pending' && f.requester_id === user?.id
  );

  const getFriendProfile = (f: Friendship): Profile | undefined => {
    if (!user?.id) return;
    return f.requester_id === user.id ? f.addressee : f.requester;
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    const results = await searchProfilesByEmail(searchEmail.trim());
    // Exclui o próprio usuário e quem já é amigo/solicitação
    const friendUserIds = friendships.map(f =>
      f.requester_id === user?.id ? f.addressee_id : f.requester_id
    );
    setSearchResults(results.filter(p => p.id !== user?.id && !friendUserIds.includes(p.id)));
    setSearching(false);
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await sendFriendRequest(user.id, addresseeId);
    if (error) {
      toast({ title: 'Erro', description: error, variant: 'destructive' });
    } else {
      toast({ title: '✅ Solicitação enviada!', description: 'Aguarde a confirmação.' });
      setSearchResults(prev => prev.filter(p => p.id !== addresseeId));
      await load();
    }
    setSaving(false);
  };

  const handleRespond = async (id: string, status: 'accepted' | 'declined') => {
    await respondFriendRequest(id, status);
    if (status === 'accepted') {
      toast({ title: '🎉 Amizade aceita!' });
      // Conquista: primeiro amigo
      if (acceptedFriends.length === 0 && user?.id) {
        await awardAchievement(user.id, 'first-friend');
      }
    }
    await load();
  };

  const handleRemoveFriend = async (id: string) => {
    await removeFriend(id);
    toast({ title: 'Amigo removido.' });
    await load();
  };

  // ---- Duelos ------------------------------------------------
  const handleCreateDuo = async () => {
    if (!user?.id || !selectedFriendForDuo || !selectedPreset) return;
    setSaving(true);
    await createDuoChallenge({
      challenge_id: selectedPreset.challenge_id,
      title: selectedPreset.title,
      description: selectedPreset.description,
      emoji: selectedPreset.emoji,
      target: selectedPreset.target,
      category: selectedPreset.category,
      requester_id: user.id,
      addressee_id: selectedFriendForDuo,
    });
    toast({ title: '⚔️ Desafio enviado!', description: 'Aguarde seu amigo aceitar.' });
    setShowCreateDuo(false);
    setSelectedFriendForDuo('');
    setSelectedPreset(null);
    setSaving(false);
    await load();
  };

  const handleRespondDuo = async (id: string, status: 'accepted' | 'declined') => {
    await respondDuoChallenge(id, status);
    if (status === 'accepted') toast({ title: '⚔️ Desafio aceito! Boa sorte!' });
    else toast({ title: 'Desafio recusado.' });
    await load();
  };

  const handleDuoProgress = async (duo: DuoChallenge, delta: number) => {
    if (!user?.id) return;
    const isRequester = duo.requester_id === user.id;
    await updateDuoProgress(duo.id, isRequester, delta, duo.target);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Render ------------------------------------------------
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-500" />
            Social Financeiro
          </h1>
          <p className="text-muted-foreground mt-1">
            Adicione amigos, acompanhe conquistas e se desafie em dupla — finanças em comunidade! 💰
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} title="Atualizar" className="mt-1 shrink-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Meu perfil mini */}
      {myProfile && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-3xl">
                {myProfile.avatar_emoji}
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">{myProfile.display_name}</p>
                <p className="text-xs text-muted-foreground">{myProfile.email}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-indigo-500">{myProfile.total_points}</p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-500">{myAchievements.length}</p>
                <p className="text-xs text-muted-foreground">badges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {([
          { key: 'friends',      label: 'Amigos',    icon: Users  },
          { key: 'achievements', label: 'Conquistas', icon: Trophy },
          { key: 'duels',        label: 'Duelos',    icon: Swords },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.key === 'friends' && pendingReceived.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {pendingReceived.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== AMIGOS ===== */}
      {tab === 'friends' && (
        <div className="space-y-5">
          {/* Buscar amigo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Adicionar amigo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por e-mail..."
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <span className="text-2xl">{p.avatar_emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{p.display_name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                      <Button size="sm" onClick={() => handleSendRequest(p.id)} disabled={saving}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Adicionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchEmail && !searching && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum resultado encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Solicitações recebidas */}
          {pendingReceived.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  Solicitações recebidas ({pendingReceived.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingReceived.map(f => {
                  const p = getFriendProfile(f);
                  return (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
                      <span className="text-2xl">{p?.avatar_emoji ?? '😊'}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{p?.display_name ?? 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground">{p?.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => handleRespond(f.id, 'accepted')}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-300" onClick={() => handleRespond(f.id, 'declined')}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Enviadas pendentes */}
          {pendingSent.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Send className="h-3.5 w-3.5" /> Solicitações enviadas
              </p>
              {pendingSent.map(f => {
                const p = getFriendProfile(f);
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                    <span className="text-2xl">{p?.avatar_emoji ?? '😊'}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p?.display_name ?? 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">{p?.email}</p>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">Pendente</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista de amigos */}
          <div>
            <p className="text-sm font-medium mb-3 flex items-center gap-1">
              <UserCheck className="h-4 w-4 text-green-500" />
              Amigos ({acceptedFriends.length})
            </p>
            {acceptedFriends.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum amigo ainda.</p>
                  <p className="text-xs mt-1">Busque pelo e-mail de um amigo para começar!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {acceptedFriends.map(f => {
                  const p = getFriendProfile(f);
                  const ach = friendsAchievements.filter(a => a.user_id === p?.id);
                  return (
                    <Card key={f.id} className="hover:border-indigo-300 transition-colors">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{p?.avatar_emoji ?? '😊'}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{p?.display_name}</p>
                            <p className="text-xs text-muted-foreground">{p?.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-indigo-500 font-medium">{p?.total_points ?? 0} pts</span>
                              <span className="text-xs text-amber-500">{ach.length} conquistas</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm" variant="outline"
                              className="text-xs h-8"
                              onClick={() => { setSelectedFriendForDuo(p?.id ?? ''); setTab('duels'); setShowCreateDuo(true); }}
                            >
                              <Swords className="h-3.5 w-3.5 mr-1" /> Duelar
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="text-muted-foreground h-8 w-8 p-0"
                              onClick={() => handleRemoveFriend(f.id)}
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Últimas conquistas do amigo */}
                        {ach.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {ach.slice(0, 5).map(a => (
                              <span key={a.id} className="text-lg" title={a.achievement_definitions?.title}>
                                {a.achievement_definitions?.emoji}
                              </span>
                            ))}
                            {ach.length > 5 && (
                              <span className="text-xs text-muted-foreground self-center">+{ach.length - 5}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CONQUISTAS ===== */}
      {tab === 'achievements' && (
        <div className="space-y-5">
          {/* Minhas conquistas */}
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-amber-500" />
              Minhas conquistas ({myAchievements.length}/{allDefinitions.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allDefinitions.map(def => {
                const earned = myAchievements.find(a => a.achievement_id === def.id);
                return (
                  <Card
                    key={def.id}
                    className={`text-center transition-all ${
                      earned
                        ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20 shadow-sm'
                        : 'opacity-40 grayscale'
                    }`}
                  >
                    <CardContent className="pt-4 pb-4 px-3">
                      <div className="text-3xl mb-2">{def.emoji}</div>
                      <p className="font-semibold text-xs leading-tight">{def.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-tight">{def.description}</p>
                      <div className="mt-2 flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        <span className="text-xs font-medium text-amber-600">{def.points} pts</span>
                      </div>
                      {earned && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {new Date(earned.earned_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Feed de amigos */}
          {friendsAchievements.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-orange-500" />
                Feed dos amigos
              </h2>
              <div className="space-y-2">
                {friendsAchievements.map(a => (
                  <Card key={a.id} className="border-indigo-100 dark:border-indigo-900">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{a.achievement_definitions?.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            <span className="text-indigo-500">{a.profiles?.display_name ?? 'Amigo'}</span>
                            {' '}ganhou <strong>{a.achievement_definitions?.title}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">{a.achievement_definitions?.description}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.earned_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {friendsAchievements.length === 0 && acceptedFriends.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Adicione amigos para ver o feed de conquistas!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== DUELOS ===== */}
      {tab === 'duels' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Swords className="h-5 w-5 text-red-500" />
              Desafios em Dupla
            </h2>
            {acceptedFriends.length > 0 && (
              <Button onClick={() => setShowCreateDuo(true)} size="sm">
                + Novo Desafio
              </Button>
            )}
          </div>

          {/* Modal criar duelo */}
          {showCreateDuo && (
            <Card className="border-indigo-300 dark:border-indigo-700 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>⚔️ Criar Desafio em Dupla</span>
                  <button onClick={() => setShowCreateDuo(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Escolher amigo */}
                <div>
                  <label className="text-sm font-medium mb-2 block">1. Escolha o amigo</label>
                  <div className="grid grid-cols-1 gap-2">
                    {acceptedFriends.map(f => {
                      const p = getFriendProfile(f);
                      return (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFriendForDuo(p?.id ?? '')}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            selectedFriendForDuo === p?.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                              : 'border-border hover:border-indigo-300'
                          }`}
                        >
                          <span className="text-xl">{p?.avatar_emoji}</span>
                          <span className="font-medium text-sm">{p?.display_name}</span>
                          {selectedFriendForDuo === p?.id && (
                            <Check className="h-4 w-4 text-indigo-500 ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Escolher desafio */}
                <div>
                  <label className="text-sm font-medium mb-2 block">2. Escolha o desafio</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DUO_PRESETS.map(p => (
                      <button
                        key={p.challenge_id}
                        onClick={() => setSelectedPreset(p)}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                          selectedPreset?.challenge_id === p.challenge_id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-border hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-2xl">{p.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedFriendForDuo || !selectedPreset || saving}
                  onClick={handleCreateDuo}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Desafio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lista de duelos */}
          {duoChallenges.length === 0 && !showCreateDuo && (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <Swords className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhum duelo ainda.</p>
                {acceptedFriends.length === 0 ? (
                  <p className="text-xs mt-1">Adicione amigos primeiro para criar desafios em dupla!</p>
                ) : (
                  <p className="text-xs mt-1">Clique em &quot;Novo Desafio&quot; para desafiar um amigo!</p>
                )}
              </CardContent>
            </Card>
          )}

          {duoChallenges.map(duo => {
            const isRequester = duo.requester_id === user?.id;
            const myProgress = isRequester ? duo.requester_progress : duo.addressee_progress;
            const theirProgress = isRequester ? duo.addressee_progress : duo.requester_progress;
            const myCompleted = isRequester ? duo.requester_completed : duo.addressee_completed;
            const theirCompleted = isRequester ? duo.addressee_completed : duo.requester_completed;
            const opponent = isRequester ? duo.addressee : duo.requester;
            const myPct = Math.round((myProgress / duo.target) * 100);
            const theirPct = Math.round((theirProgress / duo.target) * 100);

            return (
              <Card
                key={duo.id}
                className={`${
                  duo.status === 'pending'
                    ? 'border-amber-300 dark:border-amber-700'
                    : duo.status === 'active' ? 'border-green-300 dark:border-green-700'
                    : 'border-muted'
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{duo.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{duo.title}</p>
                      <p className="text-xs text-muted-foreground">{duo.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      duo.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : duo.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : duo.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {duo.status === 'pending' ? '⏳ Pendente'
                        : duo.status === 'active' ? '🔥 Ativo'
                        : duo.status === 'completed' ? '🏆 Concluído'
                        : '❌ Recusado'}
                    </span>
                  </div>

                  {/* Aceitar/Recusar (addressee) */}
                  {duo.status === 'pending' && !isRequester && (
                    <div className="flex gap-2 mb-3">
                      <Button size="sm" className="flex-1" onClick={() => handleRespondDuo(duo.id, 'accepted')}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Aceitar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-500" onClick={() => handleRespondDuo(duo.id, 'declined')}>
                        <X className="h-3.5 w-3.5 mr-1" /> Recusar
                      </Button>
                    </div>
                  )}

                  {/* Progresso comparativo */}
                  {(duo.status === 'active' || duo.status === 'completed') && (
                    <div className="space-y-3">
                      {/* Eu */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">Você {myCompleted && '✅'}</span>
                          <span className="text-muted-foreground">{myProgress}/{duo.target}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-indigo-500 h-3 rounded-full transition-all" style={{ width: `${myPct}%` }} />
                        </div>
                      </div>
                      {/* Oponente */}
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{opponent?.display_name ?? 'Amigo'} {theirCompleted && '✅'}</span>
                          <span className="text-muted-foreground">{theirProgress}/{duo.target}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div className="bg-rose-500 h-3 rounded-full transition-all" style={{ width: `${theirPct}%` }} />
                        </div>
                      </div>

                      {/* Botões de atualizar progresso */}
                      {duo.status === 'active' && !myCompleted && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDuoProgress(duo, 1)}>+1 dia</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDuoProgress(duo, 7)}>+1 semana</Button>
                          {duo.category === 'Poupança' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDuoProgress(duo, 50)}>+R$50</Button>
                          )}
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
    </div>
  );
}
