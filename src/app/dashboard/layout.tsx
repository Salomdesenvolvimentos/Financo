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
import { Loader2, Menu } from 'lucide-react';

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
        
        {/* Botão Menu Flutuante (para menu suspenso) */}
        {menuSettings.behavior === 'collapsible' && (
          <button
            onClick={toggleMobileMenu}
            className="fixed top-20 left-4 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          menuSettings.behavior === 'fixed' ? 'ml-72' : ''
        }`}>
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Menu Superior
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarTop
        userName={user.nome || user.email || 'Usuário'}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        onToggleMenu={toggleMobileMenu}
        isMenuOpen={mobileMenuOpen}
        isCollapsible={menuSettings.behavior === 'collapsible'}
      />
      
      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
