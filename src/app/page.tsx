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
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
// logos
import logoBranco from '@/Financo_branco.png';
import logoPreto from '@/Financo_preto.png';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  // Modo local: preencher com dados de teste
  const isLocalMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321');
  const [formData, setFormData] = useState({
    email: isLocalMode ? 'teste@finaco.com' : '',
    password: isLocalMode ? '123456' : '',
  });

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (user && !authLoading) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // verificar tema atual para escolher logo
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await signIn(formData.email, formData.password);

    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      toast({
        title: 'Login realizado com sucesso!',
        variant: 'success',
      });
      // Forçar reload para atualizar contexto de autenticação
      window.location.href = '/dashboard';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex hero-gradient">
      {/* Left Panel – decorativo (visível apenas desktop) */}
      <div className="hidden lg:flex flex-col flex-1 items-center justify-center p-12 relative overflow-hidden">
        {/* Orbs decorativos */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'hsl(var(--primary))' }} aria-hidden="true" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full opacity-15 blur-3xl"
          style={{ background: 'hsl(var(--accent-foreground))' }} aria-hidden="true" />

        <div className="relative z-10 max-w-sm space-y-6 text-center">
          <Image
            src={isDark ? logoBranco : logoPreto}
            alt="Financo"
            width={80}
            height={80}
            className="mx-auto"
          />
          <h1 className="text-3xl font-bold tracking-tight">
            Controle financeiro inteligente
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Visualize receitas, despesas e tendências em um só lugar. Tome decisões melhores com dados claros.
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['Gráficos em tempo real', 'IA integrada', 'Importação automática', 'Modo offline'].map((f) => (
              <span key={f} className="px-3 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground border border-border">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel – formulário */}
      <div className="flex flex-1 lg:max-w-md items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">

          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center">
            <Image
              src={isDark ? logoBranco : logoPreto}
              alt="Financo"
              width={56}
              height={56}
            />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-muted-foreground text-sm">Entre na sua conta para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="email"
                aria-required="true"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
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
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/auth/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
