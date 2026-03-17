// ============================================
// FINANCO - Página: Painel Admin
// Visível apenas para salomdesenvolvimentos@hotmail.com
// ============================================

'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { apiUrl } from '@/lib/api-url';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Shield,
  Users,
  Crown,
  Search,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Clock,
} from 'lucide-react';

const ADMIN_EMAIL = 'salomdesenvolvimentos@hotmail.com';

const PERIOD_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '1 ano', days: 365 },
  { label: 'Permanente', days: 0 },
];

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'premium';
  premium_until: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(null);
  const [expandGrantFor, setExpandGrantFor] = useState<string | null>(null);

  // Configuração de preço
  const [premiumPrice, setPremiumPrice] = useState('29.90');
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceFeedback, setPriceFeedback] = useState<'ok' | 'error' | null>(null);

  // Redirecionar se não for admin
  useEffect(() => {
    if (!authLoading && user && user.email !== ADMIN_EMAIL) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  // Carregar preço atual
  useEffect(() => {
    fetch(apiUrl('/api/admin/config?key=premium_price'))
      .then(r => r.json())
      .then(d => { if (d.value) setPremiumPrice(d.value); })
      .catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await fetchToken();
    if (!token) {
      setError('Sessão expirada. Faça login novamente.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/admin/users'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erro da API: ${data.error}`);
      } else if (data.users) {
        setUsers(data.users);
      } else {
        setError(`Resposta inesperada (status ${res.status}): ${JSON.stringify(data)}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido ao buscar usuários');
    } finally {
      setLoading(false);
    }
  }, [fetchToken]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadUsers();
  }, [user, loadUsers]);

  const grantPremium = async (userId: string, days: number) => {
    setUpdating(userId);
    setExpandGrantFor(null);
    const token = await fetchToken();
    if (!token) { setUpdating(null); return; }
    try {
      const res = await fetch(apiUrl('/api/admin/users'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, plan: 'premium', days }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, plan: 'premium', premium_until: data.premium_until ?? null } : u
        ));
        setFeedback({ id: userId, ok: true });
      } else {
        setFeedback({ id: userId, ok: false });
      }
    } catch {
      setFeedback({ id: userId, ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const revokePremium = async (userId: string) => {
    setUpdating(userId);
    const token = await fetchToken();
    if (!token) { setUpdating(null); return; }
    try {
      const res = await fetch(apiUrl('/api/admin/users'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, plan: 'free', days: null }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, plan: 'free', premium_until: null } : u
        ));
        setFeedback({ id: userId, ok: true });
      } else {
        setFeedback({ id: userId, ok: false });
      }
    } catch {
      setFeedback({ id: userId, ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  const savePrice = async () => {
    const price = parseFloat(premiumPrice.replace(',', '.'));
    if (isNaN(price) || price < 0) return;
    setPriceSaving(true);
    const token = await fetchToken();
    if (!token) { setPriceSaving(false); return; }
    try {
      const res = await fetch(apiUrl('/api/admin/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: 'premium_price', value: price.toFixed(2) }),
      });
      const data = await res.json();
      setPriceFeedback(data.success ? 'ok' : 'error');
    } catch {
      setPriceFeedback('error');
    } finally {
      setPriceSaving(false);
      setTimeout(() => setPriceFeedback(null), 2500);
    }
  };

  // Aguardar auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Não é admin
  if (!user || user.email !== ADMIN_EMAIL) return null;

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const premiumCount = users.filter(u => u.plan === 'premium').length;

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de usuários e planos</p>
        </div>
        <Button variant="outline" size="icon" className="ml-auto" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Total de usuários</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{premiumCount}</p>
              <p className="text-xs text-muted-foreground">Premium</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-slate-400" />
            <div>
              <p className="text-2xl font-bold">{users.length - premiumCount}</p>
              <p className="text-xs text-muted-foreground">Free</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuração de preço */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Preço do Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 max-w-xs">
            <span className="text-sm font-medium text-muted-foreground shrink-0">R$</span>
            <Input
              value={premiumPrice}
              onChange={e => setPremiumPrice(e.target.value)}
              className="h-9 text-sm"
              placeholder="29.90"
              type="number"
              min="0"
              step="0.01"
            />
            <Button
              size="sm"
              onClick={savePrice}
              disabled={priceSaving}
              className="h-9 px-4 shrink-0"
            >
              {priceSaving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : priceFeedback === 'ok'
                ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                : priceFeedback === 'error'
                ? <XCircle className="h-3.5 w-3.5 text-red-500" />
                : 'Salvar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Valor exibido na página de assinatura e usado no QR Code PIX.
          </p>
        </CardContent>
      </Card>

      {/* Tabela de usuários */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Usuários</CardTitle>
            <div className="relative ml-auto w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              <strong>Erro:</strong> {error}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-0.5">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-4">Usuário</div>
                <div className="col-span-2">Cadastro / Login</div>
                <div className="col-span-3">Plano</div>
                <div className="col-span-3 text-right">Ação</div>
              </div>

              {filtered.map(u => (
                <Fragment key={u.id}>
                  <div className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors items-center text-sm">
                    {/* Nome / e-mail / email confirmado */}
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium truncate">{u.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <span className={`text-xs font-medium ${u.email_confirmed_at ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {u.email_confirmed_at ? '✓ E-mail confirmado' : '✗ Não confirmado'}
                      </span>
                    </div>

                    {/* Cadastro + último login */}
                    <div className="col-span-2 text-xs text-muted-foreground space-y-0.5">
                      <p>{new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                      {u.last_sign_in_at ? (
                        <p className="flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          {new Date(u.last_sign_in_at).toLocaleDateString('pt-BR')}
                        </p>
                      ) : (
                        <p className="text-muted-foreground/50">Nunca</p>
                      )}
                    </div>

                    {/* Plano + expiração */}
                    <div className="col-span-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.plan === 'premium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {u.plan === 'premium' && <Crown className="h-2.5 w-2.5" />}
                        {u.plan === 'free' ? 'Free' : 'Premium'}
                      </span>
                      {u.plan === 'premium' && u.premium_until && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          até {new Date(u.premium_until).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {u.plan === 'premium' && !u.premium_until && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Permanente</p>
                      )}
                    </div>

                    {/* Ação */}
                    <div className="col-span-3 flex justify-end gap-1.5">
                      {feedback?.id === u.id ? (
                        feedback.ok
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />
                      ) : u.plan === 'free' ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs px-3"
                          disabled={updating === u.id}
                          onClick={() => setExpandGrantFor(v => v === u.id ? null : u.id)}
                        >
                          {updating === u.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : 'Ativar Premium'}
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={updating === u.id}
                            onClick={() => setExpandGrantFor(v => v === u.id ? null : u.id)}
                          >
                            Renovar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            disabled={updating === u.id}
                            onClick={() => revokePremium(u.id)}
                          >
                            {updating === u.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Rebaixar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Período de premium — aparece ao clicar Ativar / Renovar */}
                  {expandGrantFor === u.id && (
                    <div className="mx-3 mb-1 p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-wrap gap-2 items-center">
                      <span className="text-xs font-medium text-muted-foreground">Período:</span>
                      {PERIOD_PRESETS.map(p => (
                        <Button
                          key={p.days}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => grantPremium(u.id, p.days)}
                        >
                          {p.label}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs ml-auto"
                        onClick={() => setExpandGrantFor(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

