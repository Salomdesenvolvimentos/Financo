// ============================================
// Página: Assinatura / Planos
// Comparação Free vs Premium + upgrade via Mercado Pago
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/api-url';
import { supabase } from '@/lib/supabase';
import {
  Crown,
  Check,
  X,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  BadgeCheck,
  CreditCard,
  Receipt,
} from 'lucide-react';

const FREE_FEATURES = [
  { label: 'Transações manuais ilimitadas', included: true },
  { label: 'Gastos e rendas fixas', included: true },
  { label: 'Desafios de poupança', included: true },
  { label: 'Importação via CSV / PDF', included: true },
  { label: 'Categorias personalizadas', included: true },
  { label: 'Calendário financeiro', included: true },
  { label: 'IA Financeira (Financo AI)', included: false },
  { label: 'Investimentos', included: false },
  { label: 'Personalização do menu', included: false },
  { label: 'Open Finance (Pluggy)', included: false },
  { label: 'Sync automático com banco', included: false },
];

const PREMIUM_FEATURES = [
  { label: 'Tudo do plano Free', included: true },
  { label: 'IA Financeira — análise inteligente', included: true },
  { label: 'Carteira de Investimentos', included: true },
  { label: 'Personalização do menu (lateral / topo)', included: true },
  { label: 'Open Finance — conexão com banco', included: true },
  { label: 'Sync automático — Nubank, Itaú, Inter…', included: true },
  { label: 'Parcelas detectadas automaticamente', included: true },
  { label: 'Importação de investimentos automática', included: true },
  { label: 'Suporte prioritário', included: true },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { isPremium, loading } = usePlan();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const mpStatus = searchParams.get('mp_status');

  const [price, setPrice] = useState(29.90);
  const [paying, setPaying] = useState(false);

  // Busca o preço atual configurado pelo admin
  useEffect(() => {
    fetch(apiUrl('/api/admin/config?key=premium_price'))
      .then(r => r.json())
      .then(d => { if (d.value) setPrice(parseFloat(d.value) || 29.90); })
      .catch(() => {});
  }, []);

  const priceLabel = price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handlePayWithMP = useCallback(async () => {
    if (!user) return;
    setPaying(true);
    try {
      // Usa o singleton do Supabase (storageKey: 'finaco-auth') para obter o token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? '';

      const res = await fetch(apiUrl('/api/mercadopago/create-preference'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: user.email }),
      });

      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? 'Erro ao iniciar pagamento');
      }
      // Redirecionar para o checkout do Mercado Pago
      window.location.href = json.url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível iniciar o pagamento.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
      setPaying(false);
    }
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Configurações
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Planos e Assinatura</h1>
        <p className="text-muted-foreground mt-1">Escolha o plano ideal para você</p>
      </div>

      {/* Plano atual (se Premium) */}
      {isPremium && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">Plano Premium ativo!</p>
            <p className="text-sm text-green-700 dark:text-green-300">Você tem acesso completo a todos os recursos.</p>
          </div>
        </div>
      )}

      {/* Feedback do pagamento via Mercado Pago */}
      {mpStatus === 'approved' && !isPremium && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-200">Pagamento recebido!</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">Seu Premium está sendo ativado. Atualize a página em alguns instantes.</p>
          </div>
        </div>
      )}
      {mpStatus === 'pending' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">Pagamento pendente</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">Assim que o pagamento for confirmado, seu Premium será ativado automaticamente.</p>
          </div>
        </div>
      )}
      {mpStatus === 'failure' && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">Pagamento não concluído</p>
            <p className="text-sm text-red-700 dark:text-red-300">Não foi possível processar o pagamento. Tente novamente abaixo.</p>
          </div>
        </div>
      )}

      {/* Comparação de planos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <Card className={`relative ${!isPremium ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
          {!isPremium && (
            <div className="absolute -top-3 left-5">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Plano atual</span>
            </div>
          )}
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Free</CardTitle>
                <p className="text-2xl font-bold mt-0.5">R$0 <span className="text-sm font-normal text-muted-foreground">/ mês</span></p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {FREE_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-sm">
                {f.included
                  ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  : <X className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />}
                <span className={f.included ? '' : 'text-muted-foreground/60 line-through'}>{f.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Premium */}
        <Card className={`relative border-primary/60 shadow-lg ${isPremium ? 'ring-1 ring-primary/20' : ''}`}>
          {isPremium && (
            <div className="absolute -top-3 left-5">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Plano atual</span>
            </div>
          )}
          <div className="absolute -top-3 right-5">
            <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full font-medium flex items-center gap-1">
              <Crown className="h-3 w-3" /> Premium
            </span>
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Premium</CardTitle>
                <p className="text-2xl font-bold mt-0.5">
                  R${priceLabel}
                  <span className="text-sm font-normal text-muted-foreground"> / mês</span>
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 text-sm">
                <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{f.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bloco de pagamento via Mercado Pago (só para Free) */}
      {!isPremium && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              Assinar Premium
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pague com cartão, Pix ou boleto de forma rápida e segura pelo Mercado Pago.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preço destacado */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">Financo Premium</p>
                <p className="font-semibold text-lg">R${priceLabel}<span className="text-sm font-normal text-muted-foreground"> / mês</span></p>
              </div>
              <div className="flex items-center gap-1.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full font-medium">
                <Check className="h-3 w-3" />
                Renovação mensal
              </div>
            </div>

            {/* Formas de pagamento aceitas */}
            <div className="flex flex-wrap gap-2">
              {['Cartão de crédito', 'Cartão de débito', 'Pix', 'Boleto'].map(f => (
                <span key={f} className="text-xs border border-border rounded-full px-3 py-1 text-muted-foreground bg-muted/30">
                  {f}
                </span>
              ))}
            </div>

            {/* Botão de pagamento */}
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handlePayWithMP}
              disabled={paying}
            >
              {paying
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</>
                : <><CreditCard className="h-4 w-4" /> Pagar com Mercado Pago</>
              }
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Pagamento 100% seguro processado pelo Mercado Pago. Você será redirecionado para a tela de checkout.
            </p>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">FAQ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              q: 'Como funciona o pagamento?',
              a: 'Ao clicar em "Pagar com Mercado Pago" você é redirecionado para o checkout seguro do Mercado Pago. Pode pagar com cartão, Pix ou boleto. Após a confirmação, seu Premium é ativado automaticamente.',
            },
            {
              q: 'Em quanto tempo meu Premium é ativado?',
              a: 'Pagamentos com cartão e Pix são confirmados em segundos. Boleto pode levar até 3 dias úteis. A ativação é automática assim que o Mercado Pago confirmar.',
            },
            {
              q: 'Quantos bancos posso conectar?',
              a: 'Sem limite! Conecte Nubank, Itaú, Bradesco, XP, Inter, Santander e mais de 100 instituições.',
            },
            {
              q: 'O plano Free tem limite de transações?',
              a: 'Não. Com o plano Free você pode lançar transações manualmente sem nenhum limite.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="p-4 rounded-xl border border-border bg-card">
              <p className="font-medium text-sm mb-1">{q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
