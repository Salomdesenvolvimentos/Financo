// ============================================
// Layout: Dashboard
// Layout protegido para páginas autenticadas com menu configurável
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useMenuSettings, MenuPosition, MenuBehavior } from '@/hooks/use-menu-settings';
import { usePlan } from '@/hooks/use-plan';
import { useFriendRequests } from '@/hooks/use-friend-requests';
import { Sidebar } from '@/components/navbar-sidebar';
import { NavbarTop } from '@/components/navbar-top';
import { Loader2, Menu, X, ChevronUp } from 'lucide-react';
import { AIChatBot } from '@/components/ai-chatbot';
import { SiteTour } from '@/components/site-tour';

export default function DashboardLayoutNew({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { settings: menuSettings } = useMenuSettings();
  const { isPremium } = usePlan();
  const { pendingCount: friendRequestCount } = useFriendRequests();

  // Free plan: always sidebar fixed
  const effectivePosition: MenuPosition = isPremium ? menuSettings.position : 'side';
  const effectiveBehavior: MenuBehavior = isPremium ? menuSettings.behavior : 'fixed';
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        return true;
      }
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Menu Lateral
  if (effectivePosition === 'side') {
    return (
      <div className="min-h-screen flex">
        <Sidebar
          isOpen={mobileMenuOpen}
          onClose={closeMobileMenu}
          userName={user.nome || user.email || 'Usuário'}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          isCollapsible={effectiveBehavior === 'collapsible'}
          friendRequestCount={friendRequestCount}
        />

        {/* Hamburger — visível só no mobile */}
        <button
          onClick={toggleMobileMenu}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          className="fixed top-3 left-3 z-[60] md:hidden flex items-center justify-center w-9 h-9 bg-background dark:bg-card border border-border rounded-lg shadow-sm hover:bg-muted transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Botão toggle para sidebar colapsável no desktop */}
        {effectiveBehavior === 'collapsible' && !mobileMenuOpen && (
          <button
            onClick={toggleMobileMenu}
            aria-label="Abrir menu"
            className="fixed top-1/2 -translate-y-1/2 left-0 z-40 hidden md:flex flex-col items-center justify-center gap-1 w-4 h-16 bg-muted hover:bg-accent border border-l-0 border-border rounded-r-lg shadow-sm transition-all duration-300 ease-in-out"
          >
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          </button>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 transition-all duration-300 ease-in-out pt-14 md:pt-0 ${
          effectiveBehavior === 'fixed' ? 'md:ml-64' : mobileMenuOpen ? 'md:ml-64' : 'ml-0'
        }`}>
          <div className="container py-4 md:py-6">
            {children}
          </div>
        </main>
        <AIChatBot />
        <SiteTour />
        {/* Botão voltar ao topo — aparece ao rolar, apenas no mobile */}
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Voltar ao topo"
            className="fixed left-4 bottom-24 z-40 md:hidden bg-background/70 backdrop-blur-sm border border-border rounded-full p-2 shadow text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // Menu Superior
  return (
    <div className="min-h-screen flex flex-col">
      {/* NavbarTop é fixed — não ocupa espaço no fluxo */}
      <NavbarTop
        userName={user.nome || user.email || 'Usuário'}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onToggleMenu={toggleMobileMenu}
        isMenuOpen={mobileMenuOpen}
        isCollapsible={effectiveBehavior === 'collapsible'}
        hidden={navbarHidden}
        friendRequestCount={friendRequestCount}
      />

      {/* Tab central para ocultar/mostrar navbar — sempre visível */}
      <button
        onClick={() => setNavbarHidden(!navbarHidden)}
        aria-label={navbarHidden ? 'Mostrar menu' : 'Ocultar menu'}
        className={`fixed left-1/2 -translate-x-1/2 z-[200] flex items-center justify-center gap-0.5 h-5 w-14 bg-muted hover:bg-accent border border-t-0 border-border rounded-b-lg shadow-sm transition-all duration-300 ${
          navbarHidden ? 'top-0' : 'top-14'
        }`}
      >
        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
        <span className="w-1 h-1 rounded-full bg-muted-foreground" />
      </button>

      {/* Main Content — padding-top compensa a navbar fixa */}
      <main className={`flex-1 transition-all duration-300 ${navbarHidden ? 'pt-5' : 'pt-14'}`}>
        <div className="container py-4 md:py-6">
          {children}
        </div>
      </main>
      <AIChatBot />
      {/* Botão voltar ao topo — aparece ao rolar, apenas no mobile */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao topo"
          className="fixed left-4 bottom-24 z-40 md:hidden bg-background/70 backdrop-blur-sm border border-border rounded-full p-2 shadow text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
