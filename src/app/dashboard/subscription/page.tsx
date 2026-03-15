// ============================================
// Página: Assinatura / Planos
// Comparação Free vs Premium + upgrade via PIX
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePlan } from '@/hooks/use-plan';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generatePixPayload } from '@/lib/pix';
import { apiUrl } from '@/lib/api-url';
import {
  Crown,
  Check,
  X,
  Loader2,
  ArrowLeft,
  CheckCircle,
  BadgeCheck,
  Copy,
  MessageCircle,
  QrCode,
  Receipt,
} from 'lucide-react';

const PIX_KEY = 'jose_adelson@outlook.com';
const PIX_NAME = 'Jose Adelson';
const PIX_CITY = 'Sao Paulo';
const WHATSAPP_NUMBER = '5511915001508';

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
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [pixAmount, setPixAmount] = useState(29.90);

  // Busca o preço atual configurado pelo admin
  useEffect(() => {
    fetch(apiUrl('/api/admin/config?key=premium_price'))
      .then(r => r.json())
      .then(d => { if (d.value) setPixAmount(parseFloat(d.value) || 29.90); })
      .catch(() => {});
  }, []);

  const pixPayload = generatePixPayload(PIX_KEY, PIX_NAME, PIX_CITY, pixAmount);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`;
  const priceLabel = pixAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whatsappMsg = encodeURIComponent(
    `Olá! Realizei o pagamento do Financo Premium (R$${priceLabel}/mês). Meu e-mail: ${user?.email ?? ''}`
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

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

      {/* Bloco de pagamento PIX (só para Free) */}
      {!isPremium && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5 text-primary" />
              Assinar Premium via PIX
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pague R${priceLabel}/mês por PIX e envie o comprovante via WhatsApp. Ativaremos seu Premium em até 1 hora.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Passos */}
            <ol className="space-y-3 text-sm">
              {[
                'Escaneie o QR Code ou copie a chave PIX abaixo.',
                `Realize o pagamento de R$${priceLabel}.`,
                'Envie o comprovante via WhatsApp para confirmar.',
                'Seu plano Premium será ativado em até 1 hora.',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => setShowQr(v => !v)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <QrCode className="h-4 w-4" />
                {showQr ? 'Ocultar QR Code' : 'Exibir QR Code'}
              </button>

              {showQr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="rounded-xl border border-border p-2 bg-white"
                />
              )}
            </div>

            {/* Chave PIX + copiar */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Chave PIX (e-mail)</p>
                <p className="text-sm font-mono font-medium truncate">{PIX_KEY}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={handleCopy}>
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full gap-2" size="lg">
                <MessageCircle className="h-4 w-4" />
                Enviar comprovante via WhatsApp
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">FAQ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              q: 'Como funciona o Open Finance?',
              a: 'Você conecta seu banco via Pluggy. Suas credenciais nunca ficam armazenadas no Financo — a conexão é feita de forma segura pelo Pluggy.',
            },
            {
              q: 'Em quanto tempo meu Premium é ativado?',
              a: 'Após enviar o comprovante via WhatsApp, ativamos em até 1 hora (geralmente minutos).',
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
