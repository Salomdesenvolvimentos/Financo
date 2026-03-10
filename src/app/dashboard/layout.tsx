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
import { Sidebar } from '@/components/navbar-sidebar';
import { NavbarTop } from '@/components/navbar-top';
import { Loader2, Menu } from 'lucide-react';
import { AIChatBot } from '@/components/ai-chatbot';

export default function DashboardLayoutNew({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { settings: menuSettings } = useMenuSettings();
  const { isPremium } = usePlan();

  // Free plan: always sidebar fixed
  const effectivePosition: MenuPosition = isPremium ? menuSettings.position : 'side';
  const effectiveBehavior: MenuBehavior = isPremium ? menuSettings.behavior : 'fixed';
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navbarHidden, setNavbarHidden] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Carregar tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

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
          isOpen={effectiveBehavior === 'fixed' ? true : mobileMenuOpen}
          onClose={closeMobileMenu}
          userName={user.nome || user.email || 'Usuário'}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          isCollapsible={effectiveBehavior === 'collapsible'}
        />

        {/* Botão toggle para sidebar colapsável */}
        {effectiveBehavior === 'collapsible' && !mobileMenuOpen && (
          <button
            onClick={toggleMobileMenu}
            aria-label="Abrir menu"
            className="fixed top-1/2 -translate-y-1/2 left-0 z-40 flex flex-col items-center justify-center gap-1 w-4 h-16 bg-muted hover:bg-accent border border-l-0 border-border rounded-r-lg shadow-sm transition-all duration-300 ease-in-out"
          >
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          </button>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          effectiveBehavior === 'fixed' ? 'ml-64' : mobileMenuOpen ? 'ml-64' : 'ml-0'
        }`}>
          <div className="container py-6">
            {children}
          </div>
        </main>
        <AIChatBot />
      </div>
    );
  }

  // Menu Superior
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar - ocultável */}
      <div className={`transition-all duration-300 ${navbarHidden ? '-translate-y-full h-0 overflow-hidden' : 'translate-y-0'}`}>
        <NavbarTop
          userName={user.nome || user.email || 'Usuário'}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onToggleMenu={toggleMobileMenu}
          isMenuOpen={mobileMenuOpen}
          isCollapsible={effectiveBehavior === 'collapsible'}
        />
      </div>

      {/* Tab central para ocultar/mostrar navbar - igual ao sidebar */}
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

      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-6">
          {children}
        </div>
      </main>
      <AIChatBot />
    </div>
  );
}
