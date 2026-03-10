// ============================================
// FINANCO - Página: Painel Admin
// Visível apenas para salomdesenvolvimentos@hotmail.com
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
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
} from 'lucide-react';

const ADMIN_EMAIL = 'salomdesenvolvimentos@hotmail.com';

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'premium';
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(null);

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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const token = await fetchToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [fetchToken]);

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) loadUsers();
  }, [user, loadUsers]);

  const togglePlan = async (userId: string, currentPlan: 'free' | 'premium') => {
    const newPlan = currentPlan === 'free' ? 'premium' : 'free';
    setUpdating(userId);
    const token = await fetchToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, plan: newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
        setFeedback({ id: userId, ok: true });
      } else {
        setFeedback({ id: userId, ok: false });
      }
    } catch {
      setFeedback({ id: userId, ok: false });
    } finally {
      setUpdating(null);
      setTimeout(() => setFeedback(null), 2000);
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

      {/* Tabela */}
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-5">Usuário</div>
                <div className="col-span-3">Cadastro</div>
                <div className="col-span-2 text-center">Plano</div>
                <div className="col-span-2 text-center">Ação</div>
              </div>

              {filtered.map(u => (
                <div key={u.id} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors items-center text-sm">
                  <div className="col-span-5 min-w-0">
                    <p className="font-medium truncate">{u.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.plan === 'premium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {u.plan === 'premium' && <Crown className="h-2.5 w-2.5" />}
                      {u.plan === 'free' ? 'Free' : 'Premium'}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {feedback?.id === u.id ? (
                      feedback.ok
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Button
                        size="sm"
                        variant={u.plan === 'free' ? 'default' : 'outline'}
                        className="h-7 text-xs px-3"
                        disabled={updating === u.id}
                        onClick={() => togglePlan(u.id, u.plan)}
                      >
                        {updating === u.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : u.plan === 'free' ? 'Ativar Premium' : 'Rebaixar'
                        }
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
