// ============================================
// Componente: SiteTour
// Tutorial interativo com spotlight e tooltips
// Usa driver.js — https://driverjs.com
// ============================================

'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { BookOpen } from 'lucide-react';

const TOUR_KEY = 'financo_tour_v2_done';

// ─── Passos do tour ──────────────────────────────────────────────────────────
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
        'Grupo com tudo relacionado ao seu <strong>dinheiro do dia a dia</strong>. Clique no grupo para expandir os itens.',
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
        'Grupo com ferramentas para <strong>crescer financeiramente</strong>: investimentos, desafios e metas de poupança.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-investments',
    popover: {
      title: '📈 Investimentos',
      description:
        'Gerencie sua carteira — renda fixa, ações, FIIs e cripto. Inclui um <strong>ticker ao vivo</strong> com cotações de criptomoedas via CoinGecko (gratuito).',
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
        'Crie <strong>metas financeiras</strong> com valor alvo e prazo: viagem, notebook, reserva de emergência. A IA dá insights para você chegar lá mais rápido.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-social',
    popover: {
      title: '👥 Social',
      description:
        'Adicione amigos, acompanhe as <strong>conquistas deles</strong> e crie desafios em dupla. Compete de forma saudável e se motiva junto!',
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
        'Estes 4 cards mostram sua saúde financeira do mês: <strong>Receita</strong>, <strong>Despesa</strong>, <strong>Saldo</strong> e <strong>Taxa de Economia</strong>. 🟢 Verde = ótimo • 🟡 Amarelo = atenção • 🔴 Vermelho = alerta.',
      side: 'bottom' as const,
    },
  },
  {
    element: undefined as string | undefined,
    popover: {
      title: '🎉 Pronto para começar!',
      description:
        `Você conheceu todas as seções do Financo! Qualquer dúvida, use o <strong>chat de IA</strong> no canto inferior direito.<br/><br/>
        <label id="tour-no-show-label" style="display:flex;align-items:center;gap:10px;margin-top:8px;cursor:pointer;user-select:none;">
          <span id="tour-checkbox-icon" style="width:20px;height:20px;border:2px solid #6b7280;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;background:transparent"></span>
          <span style="font-size:14px">Não mostrar novamente ao entrar</span>
        </label>`,
      side: 'over' as const,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────────
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
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Concluir',
      allowClose: true,
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: 'financo-tour-popover',
      onNextClick: () => {
        const idx = driverObj.getActiveIndex() ?? 0;
        // Inicializa o checkbox quando chegar no último passo
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


import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, X } from 'lucide-react';

const TOUR_KEY = 'financo_tour_v2_done';

// ─── Passos do tour ──────────────────────────────────────────────────────────
const steps = [
  {
    // Passo de boas-vindas — sem elemento alvo (centrado)
    element: undefined as string | undefined,
    popover: {
      title: '👋 Bem-vindo ao Financo!',
      description:
        'Vamos fazer um tour rápido para você conhecer tudo que o Financo oferece. Clique em <strong>Próximo</strong> para continuar ou <strong>Pular</strong> para ir direto ao aplicativo.',
      side: 'over' as const,
    },
  },
  {
    element: '#tour-sidebar',
    popover: {
      title: '🧭 Menu de Navegação',
      description:
        'Este é o menu lateral — seu ponto de partida para todas as seções. Os itens estão agrupados em <strong>Finanças</strong> e <strong>Metas</strong>. Clique em um grupo para expandir.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-financas',
    popover: {
      title: '💳 Grupo Finanças',
      description:
        'Aqui ficam suas <strong>Transações</strong> do dia a dia, <strong>Gastos Fixos</strong> (aluguel, streaming, etc.) e <strong>Rendas Fixas</strong> (salário, freelances). Clique para expandir o grupo.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-group-metas',
    popover: {
      title: '🎯 Grupo Metas',
      description:
        'Acompanhe seus <strong>Investimentos</strong>, participe de <strong>Desafios</strong> de economia e gerencie sua <strong>Lista de Desejos</strong> — metas financeiras com progresso e prazo.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-social',
    popover: {
      title: '👥 Social',
      description:
        'Adicione amigos, veja as conquistas deles, e participe de <strong>desafios em dupla</strong>! Compita em metas de economia e ganhe pontos junto.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-kpi-cards',
    popover: {
      title: '📊 Resumo Financeiro',
      description:
        'Estes 4 cards mostram sua saúde financeira do mês: <strong>Receita</strong>, <strong>Despesa</strong>, <strong>Saldo</strong> e <strong>Taxa de Economia</strong>. Verde = ótimo, vermelho = atenção!',
      side: 'top' as const,
    },
  },
  {
    element: '#tour-nav-investments',
    popover: {
      title: '📈 Investimentos',
      description:
        'Registre sua carteira de investimentos — renda fixa, ações, FIIs, cripto. Inclui um <strong>ticker ao vivo</strong> com cotações de criptomoedas via CoinGecko.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-import',
    popover: {
      title: '📥 Importar Dados',
      description:
        'Importe extratos bancários em <strong>CSV</strong> ou <strong>PDF</strong>. O sistema categoriza as transações automaticamente com IA.',
      side: 'right' as const,
    },
  },
  {
    element: '#tour-nav-settings',
    popover: {
      title: '⚙️ Configurações',
      description:
        'Personalize o tema (claro/escuro), posição do menu, categorias personalizadas e preferências como o ticker de criptomoedas.',
      side: 'right' as const,
    },
  },
  {
    // Último passo — sem elemento (centrado), com checkbox
    element: undefined as string | undefined,
    popover: {
      title: '🎉 Pronto para começar!',
      description:
        `Você conheceu as principais funcionalidades do Financo. Qualquer dúvida, use o <strong>chat de IA</strong> no canto inferior direito — ele analisa seus dados e dá insights personalizados.<br/><br/>
        <label id="tour-no-show-label" style="display:flex;align-items:center;gap:10px;margin-top:4px;cursor:pointer;user-select:none;">
          <span id="tour-checkbox-icon" style="width:20px;height:20px;border:2px solid #6b7280;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s">
          </span>
          <span style="font-size:14px;color:var(--tw-prose-body,#374151)">Não mostrar novamente ao entrar</span>
        </label>`,
      side: 'over' as const,
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isNoShowChecked(): boolean {
  const label = document.getElementById('tour-no-show-label');
  return label?.dataset.checked === 'true';
}

function initCheckbox() {
  const label = document.getElementById('tour-no-show-label');
  const icon = document.getElementById('tour-checkbox-icon');
  if (!label || !icon) return;

  label.dataset.checked = 'false';

  label.addEventListener('click', () => {
    const checked = label.dataset.checked === 'true';
    label.dataset.checked = checked ? 'false' : 'true';
    icon.style.background = checked ? '' : '#3b82f6';
    icon.style.borderColor = checked ? '#6b7280' : '#3b82f6';
    icon.innerHTML = checked
      ? ''
      : `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,2.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SiteTour() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [showButton, setShowButton] = useState(false);

  const startTour = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const { driver } = await import('driver.js');

    const driverObj = driver({
      showProgress: true,
      progressText: 'Passo {{current}} de {{total}}',
      nextBtnText: 'Próximo →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Concluir',
      allowClose: true,
      overlayOpacity: 0.72,
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'financo-tour-popover',
      onNextClick: () => {
        const activeIndex = driverObj.getActiveIndex() ?? 0;
        if (activeIndex === steps.length - 2) {
          setTimeout(initCheckbox, 50);
        }
        driverObj.moveNext();
      },
      onDestroyStarted: () => {
        if (isNoShowChecked()) {
          localStorage.setItem(TOUR_KEY, 'true');
        }
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
    if (!user) return;
    if (pathname !== '/dashboard') {
      // Nas outras páginas apenas mostra o botão de replay se o tour já foi fechado
      setShowButton(localStorage.getItem(TOUR_KEY) !== 'true' ? false : false);
      return;
    }

    const done = localStorage.getItem(TOUR_KEY) === 'true';
    if (done) {
      setShowButton(true); // Botão de replay visível
      return;
    }

    // Aguarda o DOM carregar antes de iniciar
    const timeout = setTimeout(() => {
      startTour();
    }, 900);

    return () => clearTimeout(timeout);
  }, [user, pathname, startTour]);

  // Botão flutuante "Ver tour novamente" — aparece no dashboard após o tour ser completado
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
