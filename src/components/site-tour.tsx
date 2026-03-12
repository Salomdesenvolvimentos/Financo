// ============================================
// Componente: SiteTour
// Tutorial interativo com spotlight e tooltips
// Usa driver.js â€” https://driverjs.com
// ============================================

'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';

const TOUR_KEY = 'financo_tour_v2_done';

// â”€â”€â”€ Passos do tour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const steps = [
  {
    element: undefined as string | undefined,
    popover: {
      title: 'ðŸ‘‹ Bem-vindo ao Financo!',
      description:
        'Vamos fazer um tour rÃ¡pido para vocÃª conhecer todas as seÃ§Ãµes. Clique em <strong>PrÃ³ximo â†’</strong> para comeÃ§ar, ou <strong>Pular</strong> para ir direto ao app.',
      side: 'over' as const,
    },
  },
  {
    element: '#tour-nav-dashboard',
    popover: {
      title: 'ðŸ  Dashboard',
      description:
        'A pÃ¡gina principal. Aqui vocÃª vÃª um <strong>resumo financeiro</strong> do mÃªs: receitas, despesas, saldo e taxa de economia â€” tudo num sÃ³ lugar.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-financas',
    popover: {
      title: 'ðŸ’³ FinanÃ§as',
      description:
        'Grupo com tudo relacionado ao seu <strong>dinheiro do dia a dia</strong>. Clique no grupo para expandir os itens.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-transactions',
    popover: {
      title: 'ðŸ”„ TransaÃ§Ãµes',
      description:
        'Registre e acompanhe todas as suas <strong>movimentaÃ§Ãµes financeiras</strong> â€” entradas e saÃ­das, com categorias e filtros por perÃ­odo.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-fixed-expenses',
    popover: {
      title: 'ðŸ“Œ Gastos Fixos',
      description:
        'Cadastre despesas recorrentes como <strong>aluguel, streaming, planos</strong> e assinaturas. O sistema os inclui automaticamente nos cÃ¡lculos mensais.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-fixed-income',
    popover: {
      title: 'ðŸ’µ Rendas Fixas',
      description:
        'Registre suas <strong>fontes de renda recorrentes</strong>: salÃ¡rio, freelances, aluguÃ©is recebidos. Elas sÃ£o contabilizadas na sua receita total.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-metas',
    popover: {
      title: 'ðŸŽ¯ Metas',
      description:
        'Grupo com ferramentas para <strong>crescer financeiramente</strong>: investimentos, desafios e metas de poupanÃ§a.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-investments',
    popover: {
      title: 'ðŸ“ˆ Investimentos',
      description:
        'Gerencie sua carteira â€” renda fixa, aÃ§Ãµes, FIIs e cripto. Inclui um <strong>ticker ao vivo</strong> com cotaÃ§Ãµes de criptomoedas via CoinGecko (gratuito).',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-challenges',
    popover: {
      title: 'ðŸ† Desafios',
      description:
        'Participe de <strong>desafios de economia</strong> â€” sozinho ou em dupla com um amigo. Ganhe pontos e conquistas ao completÃ¡-los!',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-wishlist',
    popover: {
      title: 'âœ¨ Lista de Desejos',
      description:
        'Crie <strong>metas financeiras</strong> com valor alvo e prazo: viagem, notebook, reserva de emergÃªncia. A IA dÃ¡ insights para vocÃª chegar lÃ¡ mais rÃ¡pido.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-social',
    popover: {
      title: 'ðŸ‘¥ Social',
      description:
        'Adicione amigos, acompanhe as <strong>conquistas deles</strong> e crie desafios em dupla. Compete de forma saudÃ¡vel e se motiva junto!',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-import',
    popover: {
      title: 'ðŸ“¥ Importar',
      description:
        'Importe extratos bancÃ¡rios em <strong>CSV ou PDF</strong>. O sistema usa IA para categorizar as transaÃ§Ãµes automaticamente.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-settings',
    popover: {
      title: 'âš™ï¸ ConfiguraÃ§Ãµes',
      description:
        'Personalize o <strong>tema</strong> (claro/escuro), posiÃ§Ã£o do menu, categorias prÃ³prias e ative/desative o ticker de criptomoedas.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-kpi-cards',
    popover: {
      title: 'ðŸ“Š Seus Indicadores',
      description:
        'Estes 4 cards mostram sua saÃºde financeira do mÃªs: <strong>Receita</strong>, <strong>Despesa</strong>, <strong>Saldo</strong> e <strong>Taxa de Economia</strong>. ðŸŸ¢ Verde = Ã³timo â€¢ ðŸŸ¡ Amarelo = atenÃ§Ã£o â€¢ ðŸ”´ Vermelho = alerta.',
      side: 'bottom' as const,
    },
  },
  {
    element: undefined as string | undefined,
    popover: {
      title: 'ðŸŽ‰ Pronto para comeÃ§ar!',
      description:
        `VocÃª conheceu todas as seÃ§Ãµes do Financo! Qualquer dÃºvida, use o <strong>chat de IA</strong> no canto inferior direito.<br/><br/>
        <label id="tour-no-show-label" style="display:flex;align-items:center;gap:10px;margin-top:8px;cursor:pointer;user-select:none;">
          <span id="tour-checkbox-icon" style="width:20px;height:20px;border:2px solid #6b7280;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;background:transparent"></span>
          <span style="font-size:14px">NÃ£o mostrar novamente ao entrar</span>
        </label>`,
      side: 'over' as const,
    },
  },
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isNoShowChecked(): boolean {
  return document.getElementById('tour-no-show-label')?.dataset.checked === 'true';
}

function initCheckbox() {
  const label = document.getElementById('tour-no-show-label');
  const icon  = document.getElementById('tour-checkbox-icon');
  if (!label || !icon) return;
  // Evita re-inicializar
  if (label.dataset.initialized === 'true') return;
  label.dataset.initialized = 'true';
  label.dataset.checked = 'false';

  label.addEventListener('click', (e) => {
    e.stopPropagation();
    const checked = label.dataset.checked === 'true';
    label.dataset.checked = checked ? 'false' : 'true';
    icon.style.background   = checked ? 'transparent' : '#3b82f6';
    icon.style.borderColor  = checked ? '#6b7280'     : '#3b82f6';
    icon.innerHTML = checked
      ? ''
      : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  });
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function SiteTour() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [showButton, setShowButton] = useState(false);

  const startTour = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // Expande os grupos do sidebar para o tour
    window.dispatchEvent(new CustomEvent('financo:tour-start'));

    const { driver } = await import('driver.js');

    const driverObj = driver({
      showProgress: true,
      progressText: 'Passo {{current}} de {{total}}',
      nextBtnText: 'PrÃ³ximo â†’',
      prevBtnText: 'â† Anterior',
      doneBtnText: 'Concluir',
      allowClose: true,
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'financo-tour-popover',
      onNextClick: () => {
        const idx = driverObj.getActiveIndex() ?? 0;
        // Inicializa o checkbox quando chegar no Ãºltimo passo
        if (idx === steps.length - 2) setTimeout(initCheckbox, 80);
        driverObj.moveNext();
      },
      onDestroyStarted: () => {
        if (isNoShowChecked()) localStorage.setItem(TOUR_KEY, 'true');
        window.dispatchEvent(new CustomEvent('financo:tour-end'));
        driverObj.destroy();
      },
      onDestroyed: () => {
        setShowButton(true);
      },
      steps: steps.map((s) => ({
        element: s.element,
        popover: s.popover as import('driver.js').Popover,
      })),
    });

    driverObj.drive();
  }, []);

  // Auto-start na primeira visita ao dashboard
  useEffect(() => {
    if (!user || pathname !== '/dashboard') return;

    if (localStorage.getItem(TOUR_KEY) === 'true') {
      setShowButton(true);
      return;
    }

    const t = setTimeout(() => startTour(), 900);
    return () => clearTimeout(t);
  }, [user, pathname, startTour]);

  if (!showButton || pathname !== '/dashboard') return null;

  return (
    <button
      onClick={startTour}
      title="Ver tutorial novamente"
      className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card border border-border shadow-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
      aria-label="Ver tutorial do Financo"
    >
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">Tutorial</span>
    </button>
  );
}
