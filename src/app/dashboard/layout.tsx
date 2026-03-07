// ============================================
// Layout: Dashboard
// Layout protegido para páginas autenticadas com menu configurável
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useMenuSettings, MenuPosition, MenuBehavior } from '@/hooks/use-menu-settings';
import { Sidebar } from '@/components/navbar-sidebar';
import { NavbarTop } from '@/components/navbar-top';
import { Loader2, Menu, MoreHorizontal } from 'lucide-react';
import { AIChatBot } from '@/components/ai-chatbot';

export default function DashboardLayoutNew({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { settings: menuSettings } = useMenuSettings();
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
  if (menuSettings.position === 'side') {
    return (
      <div className="min-h-screen flex">
        <Sidebar
          isOpen={menuSettings.behavior === 'fixed' ? true : mobileMenuOpen}
          onClose={closeMobileMenu}
          userName={user.nome || user.email || 'Usuário'}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          isCollapsible={menuSettings.behavior === 'collapsible'}
        />

        {/* Botão toggle para sidebar colapsável */}
        {menuSettings.behavior === 'collapsible' && !mobileMenuOpen && (
          <button
            onClick={toggleMobileMenu}
            aria-label="Abrir menu"
            className="fixed top-1/2 -translate-y-1/2 left-0 z-40 flex flex-col items-center justify-center gap-0.5 w-5 h-16 bg-muted hover:bg-accent border border-l-0 border-border rounded-r-lg shadow-sm transition-colors"
          >
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
          </button>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 transition-all duration-300 ${
          menuSettings.behavior === 'fixed' ? 'ml-64' : ''
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
          onHideNavbar={() => setNavbarHidden(true)}
          isMenuOpen={mobileMenuOpen}
          isCollapsible={menuSettings.behavior === 'collapsible'}
        />
      </div>

      {/* Botão para mostrar navbar quando oculta */}
      {navbarHidden && (
        <button
          onClick={() => setNavbarHidden(false)}
          aria-label="Mostrar menu"
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-full shadow-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span>Mostrar menu</span>
        </button>
      )}

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
