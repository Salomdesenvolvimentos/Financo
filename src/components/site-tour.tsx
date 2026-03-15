'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';

const TOUR_KEY = 'financo_tour_v2_done';

// ─── Passos do tour ───────────────────────────────────────────────────────────
const steps = [
  {
    element: undefined as string | undefined,
    popover: {
      title: '👋 Bem-vindo ao Financo!',
      description:
        'Vamos fazer um tour rápido para você conhecer todas as seções. Clique em <strong>Próximo →</strong> para começar, ou <strong>Pular</strong> para ir direto ao app.',
      side: 'over' as const,
    },
  },
  {
    element: '#tour-nav-dashboard',
    popover: {
      title: '🏠 Dashboard',
      description:
        'A página principal. Aqui você vê um <strong>resumo financeiro</strong> do mês: receitas, despesas, saldo e taxa de economia — tudo num só lugar.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-financas',
    popover: {
      title: '💳 Finanças',
      description:
        'Grupo com tudo relacionado ao seu <strong>dinheiro do dia a dia</strong>. Contém Transações, Gastos Fixos e Rendas Fixas.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-transactions',
    popover: {
      title: '🔄 Transações',
      description:
        'Registre e acompanhe todas as suas <strong>movimentações financeiras</strong> — entradas e saídas, com categorias e filtros por período.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-fixed-expenses',
    popover: {
      title: '📌 Gastos Fixos',
      description:
        'Cadastre despesas recorrentes como <strong>aluguel, streaming, planos</strong> e assinaturas. O sistema os inclui automaticamente nos cálculos mensais.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-fixed-income',
    popover: {
      title: '💵 Rendas Fixas',
      description:
        'Registre suas <strong>fontes de renda recorrentes</strong>: salário, freelances, aluguéis recebidos. Elas são contabilizadas na sua receita total.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-metas',
    popover: {
      title: '🎯 Metas',
      description:
        'Grupo com ferramentas para <strong>crescer financeiramente</strong>: investimentos, desafios e lista de desejos.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-investments',
    popover: {
      title: '📈 Investimentos',
      description:
        'Gerencie sua carteira — renda fixa, ações, FIIs e cripto. Inclui um <strong>ticker ao vivo</strong> com cotações de criptomoedas via CoinGecko.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-challenges',
    popover: {
      title: '🏆 Desafios',
      description:
        'Participe de <strong>desafios de economia</strong> — sozinho ou em dupla com um amigo. Ganhe pontos e conquistas ao completá-los!',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-wishlist',
    popover: {
      title: '✨ Lista de Desejos',
      description:
        'Crie <strong>metas financeiras</strong> com valor alvo e prazo: viagem, notebook, reserva de emergência. Acompanhe o progresso em tempo real.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-social',
    popover: {
      title: '👥 Social',
      description:
        'Adicione amigos, acompanhe as <strong>conquistas deles</strong> e crie desafios em dupla. Compita de forma saudável e se motive junto!',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-import',
    popover: {
      title: '📥 Importar',
      description:
        'Importe extratos bancários em <strong>CSV ou PDF</strong>. O sistema usa IA para categorizar as transações automaticamente.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-settings',
    popover: {
      title: '⚙️ Configurações',
      description:
        'Personalize o <strong>tema</strong> (claro/escuro), posição do menu, categorias próprias e ative/desative o ticker de criptomoedas.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-kpi-cards',
    popover: {
      title: '📊 Seus Indicadores',
      description:
        'Estes 4 cards mostram sua saúde financeira do mês: <strong>Receita</strong>, <strong>Despesa</strong>, <strong>Saldo</strong> e <strong>Taxa de Economia</strong>. Verde = ótimo · Vermelho = atenção.',
      side: 'bottom' as const,
    },
  },
  {
    element: undefined as string | undefined,
    popover: {
      title: '🎉 Pronto para começar!',
      description:
        `Você conheceu todas as seções do Financo! Qualquer dúvida, use o <strong>chat de IA</strong> no canto inferior direito — ele analisa seus dados e dá insights personalizados.<br/><br/>
        <label id="tour-no-show-label" style="display:flex;align-items:center;gap:10px;margin-top:8px;cursor:pointer;user-select:none;">
          <span id="tour-checkbox-icon" style="width:20px;height:20px;border:2px solid #6b7280;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;background:transparent"></span>
          <span style="font-size:14px">Não mostrar novamente ao entrar</span>
        </label>`,
      side: 'over' as const,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isNoShowChecked(): boolean {
  return document.getElementById('tour-no-show-label')?.dataset.checked === 'true';
}

function initCheckbox() {
  const label = document.getElementById('tour-no-show-label');
  const icon  = document.getElementById('tour-checkbox-icon');
  if (!label || !icon) return;
  if (label.dataset.initialized === 'true') return;
  label.dataset.initialized = 'true';
  label.dataset.checked = 'false';

  label.addEventListener('click', (e) => {
    e.stopPropagation();
    const checked = label.dataset.checked === 'true';
    label.dataset.checked = checked ? 'false' : 'true';
    icon.style.background  = checked ? 'transparent' : '#3b82f6';
    icon.style.borderColor = checked ? '#6b7280'     : '#3b82f6';
    icon.innerHTML = checked
      ? ''
      : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  });
}

/** Injeta botão "Pular" na barra de navegação do driver.js */
function injectSkipButton(driverObj: { destroy: () => void }) {
  // Remove botão anterior se existir
  document.getElementById('financo-tour-skip')?.remove();
  const footer = document.querySelector('.driver-popover-footer');
  if (!footer) return;

  const btn = document.createElement('button');
  btn.id = 'financo-tour-skip';
  btn.textContent = 'Pular';
  btn.style.cssText =
    'background:transparent;border:none;cursor:pointer;font-size:13px;padding:6px 12px;opacity:0.65;color:inherit;flex-shrink:0;';
  btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
  btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.65'; });
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    driverObj.destroy();
  });
  // Insere antes do primeiro botão (Anterior / Próximo)
  footer.insertBefore(btn, footer.firstChild);
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SiteTour() {
  const { user } = useAuth();
  const pathname = usePathname();
  // tourActive: true enquanto o driver.js está rodando
  const [tourActive, setTourActive] = useState(false);
  // driverRef: mantém referência ao driver para permitir skip externo
  const driverRef = useState<{ destroy: () => void } | null>(null);

  const startTour = useCallback(async () => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('financo:tour-start'));
    setTourActive(true);

    const { driver } = await import('driver.js');

    // No mobile, filtra passos que referenciam elementos ocultos (sidebar colapsada)
    const isMobile = window.innerWidth < 768;
    const filteredSteps = steps.filter((s) => {
      if (!s.element) return true; // passos overlay sempre aparecem
      const el = document.querySelector(s.element);
      if (!el) return false; // elemento não existe, pular
      if (isMobile) {
        // Pular se o elemento estiver com display:none ou fora do viewport
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
      }
      return true;
    });

    const driverObj = driver({
      showProgress: true,
      progressText: 'Passo {{current}} de {{total}}',
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Concluir ✓',
      allowClose: true,
      overlayOpacity: 0.55,
      stagePadding: 8,
      stageRadius: 10,
      popoverClass: 'financo-tour-popover',
      onNextClick: () => {
        const idx = driverObj.getActiveIndex() ?? 0;
        if (idx === filteredSteps.length - 2) setTimeout(initCheckbox, 80);
        driverObj.moveNext();
        setTimeout(() => injectSkipButton(driverObj), 80);
      },
      onPrevClick: () => {
        driverObj.movePrevious();
        setTimeout(() => injectSkipButton(driverObj), 80);
      },
      onDestroyStarted: () => {
        localStorage.setItem(TOUR_KEY, 'true');
        window.dispatchEvent(new CustomEvent('financo:tour-end'));
        driverObj.destroy();
      },
      onDestroyed: () => {
        setTourActive(false);
        (driverRef as any)[1](null);
        document.getElementById('financo-tour-skip')?.remove();
      },
      steps: filteredSteps.map((s) => ({
        element: s.element,
        popover: s.popover as import('driver.js').Popover,
      })),
    });

    // Guarda referência para poder destruir de fora
    (driverRef as any)[1](driverObj);
    driverObj.drive();
    // Injeta botão Pular após breve delay para o popover renderizar
    setTimeout(() => injectSkipButton(driverObj), 300);
  }, [driverRef]);

  const skipTour = useCallback(() => {
    const ref = (driverRef as any)[0];
    if (ref) {
      ref.destroy();
    }
    localStorage.setItem(TOUR_KEY, 'true');
    setTourActive(false);
  }, [driverRef]);

  // Auto-start na primeira visita ao dashboard
  useEffect(() => {
    if (!user || pathname !== '/dashboard') return;
    if (localStorage.getItem(TOUR_KEY) === 'true') return;
    const t = setTimeout(() => startTour(), 900);
    return () => clearTimeout(t);
  }, [user, pathname, startTour]);

  // Só renderiza no dashboard
  if (pathname !== '/dashboard' || !user) return null;

  return (
    <button
      onClick={tourActive ? skipTour : startTour}
      title={tourActive ? 'Pular tutorial' : 'Ver tutorial novamente'}
      className={`fixed bottom-36 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg text-sm font-medium transition-all ${
        tourActive
          ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
          : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/80'
      }`}
      aria-label={tourActive ? 'Pular tutorial do Financo' : 'Ver tutorial do Financo'}
    >
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">{tourActive ? 'Pular Tutorial' : 'Tutorial'}</span>
    </button>
  );
}
