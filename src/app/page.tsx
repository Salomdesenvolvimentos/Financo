// ============================================
// Página: Login
// Página inicial de autenticação
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/services/auth';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, Bot, FileUp, Wifi } from 'lucide-react';
import Image from 'next/image';
import logoBranco from '@/Financo_branco.png';

const FEATURES = [
  { icon: TrendingUp, label: 'Gráficos em tempo real' },
  { icon: Bot,        label: 'IA integrada'           },
  { icon: FileUp,     label: 'Importação automática'  },
  { icon: Wifi,       label: 'Modo offline'           },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const isLocalMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321');
  const [formData, setFormData] = useState({
    email: isLocalMode ? 'teste@finaco.com' : '',
    password: isLocalMode ? '123456' : '',
  });

  useEffect(() => {
    if (user && !authLoading) router.push('/dashboard');
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(formData.email, formData.password);
    if (error) {
      toast({ title: 'Erro ao fazer login', description: error, variant: 'destructive' });
      setLoading(false);
    } else {
      toast({ title: 'Login realizado com sucesso!', variant: 'success' });
      window.location.href = '/dashboard';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] p-4 relative overflow-hidden">
      {/* Orbs de fundo */}
      <div aria-hidden="true" className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px] pointer-events-none" />

      {/* Card central */}
      <div className="relative z-10 w-full max-w-4xl rounded-2xl overflow-hidden flex shadow-2xl border border-white/10 animate-fade-in">

        {/* ── Lado esquerdo – Branding ── */}
        <div className="hidden lg:flex flex-col justify-between flex-1 p-10"
          style={{ background: 'linear-gradient(145deg, #0d1730 0%, #111c3a 60%, #0f2050 100%)' }}>

          {/* Logo */}
          <div>
            <Image src={logoBranco} alt="Financo" width={110} height={36} priority />
          </div>

          {/* Texto central */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-white leading-tight">
              Controle financeiro<br />inteligente
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Visualize receitas, despesas e tendências em um só lugar. Tome decisões melhores com dados claros.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/20">
                  <Icon className="w-4 h-4 text-blue-400" />
                </span>
                <span className="text-sm text-slate-300">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Lado direito – Formulário ── */}
        <div className="flex flex-1 flex-col justify-center p-8 lg:p-10 bg-[#0e1525] lg:max-w-sm">

          {/* Logo mobile */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image src={logoBranco} alt="Financo" width={90} height={30} priority />
          </div>

          <div className="space-y-1 mb-8">
            <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="text-slate-400 text-sm">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-300 text-sm">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
                aria-required="true"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-sm">Senha</Label>
                <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
                aria-required="true"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-blue-600 hover:bg-blue-500 text-white border-0 mt-2"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
              ) : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Não tem uma conta?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
