'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, MailWarning, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  email: string;
}

export function EmailConfirmationBanner({ email }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    setSendError(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        setSendError('Não foi possível reenviar. Tente novamente.');
      } else {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
      }
    } catch {
      setSendError('Erro inesperado. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative w-full rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30 p-4 text-sm shadow-sm mb-4">
      {/* X fechar */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso"
        className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <MailWarning className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            E-mail não confirmado
          </p>
          <p className="text-amber-700 dark:text-amber-400/90 leading-relaxed">
            Enviamos um link de confirmação para <span className="font-medium">{email}</span>.
            Por favor, verifique sua <span className="font-medium">caixa de entrada</span>,{' '}
            <span className="font-medium">spam</span>,{' '}
            <span className="font-medium">lixo eletrônico</span> e outras pastas.
          </p>

          {sendError && (
            <p className="text-red-600 dark:text-red-400 text-xs">{sendError}</p>
          )}

          <div className="pt-1">
            {sent ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                E-mail reenviado! Verifique sua caixa de entrada.
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3 border-amber-400 text-amber-800 dark:text-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                onClick={handleResend}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Reenviar confirmação
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
