// ============================================
// Componente: Navbar
// Barra de navegação principal com configurações personalizáveis
// ============================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// If project contains logo under `src/`, import it so Next can serve it.
// importar ambas as variantes da logo (nomeadas conforme solicitação)
import logoBranco from '@/Financo_branco.png';
import logoPreto from '@/Financo_preto.png';
import { Button } from '@/components/ui/button';
import { signOut } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useMenuSettings, MenuPosition, MenuBehavior } from '@/hooks/use-menu-settings';
import { MenuSettings } from '@/components/menu-settings';
import {
  DollarSign,
  LayoutDashboard,
  Receipt,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  CreditCard,
  Cog,
} from 'lucide-react';

interface NavbarProps {
  userName?: string;
}

export function NavbarNew({ userName }: NavbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings: menuSettings } = useMenuSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Carregar foto de perfil do localStorage
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  }, [user]);

  // Carregar tema do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: "Erro ao sair",
        description: "Ocorreu um erro ao tentar sair.",
        variant: "destructive",
      });
    }
  };

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

  const openSettings = () => {
    setSettingsOpen(true);
    closeMobileMenu();
  };

  // Componente de navegação
  const NavigationItems = () => (
    <>
      <Link href="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <LayoutDashboard className="h-5 w-5" />
        <span>Dashboard</span>
      </Link>
      
      <Link href="/dashboard/transactions" onClick={closeMobileMenu} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <Receipt className="h-5 w-5" />
        <span>Transações</span>
      </Link>
      
      <Link href="/dashboard/fixed-expenses" onClick={closeMobileMenu} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <CreditCard className="h-5 w-5" />
        <span>Gastos Fixos</span>
      </Link>
      
      <Link href="/dashboard/fixed-income" onClick={closeMobileMenu} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <DollarSign className="h-5 w-5" />
        <span>Rendas Fixas</span>
      </Link>
      
      <Link href="/dashboard/import" onClick={closeMobileMenu} className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <Upload className="h-5 w-5" />
        <span>Importar</span>
      </Link>
      
      <button
        onClick={openSettings}
        className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Cog className="h-5 w-5" />
        <span>Configurações</span>
      </button>
    </>
  );

  // Menu Lateral
  if (menuSettings.position === 'side') {
    return (
      <>
        {/* Sidebar */}
        <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-40 transition-transform duration-300 ${
          menuSettings.behavior === 'collapsible' ? (mobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        } ${menuSettings.behavior === 'fixed' ? 'w-64' : 'w-64'}`}>
          
          {/* Logo */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src={darkMode ? logoBranco : logoPreto}
                alt="Financo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Financo</span>
            </Link>
          </div>

          {/* Menu Toggle (para menu suspenso) */}
          {menuSettings.behavior === 'collapsible' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="absolute right-4 top-6"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            <NavigationItems />
          </nav>

          {/* User Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={userName || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {(userName || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {userName || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="flex-1"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex-1"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Overlay para menu suspenso */}
        {menuSettings.behavior === 'collapsible' && mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={toggleMobileMenu}
          />
        )}

        {/* Main Content Offset */}
        <div className={`${menuSettings.behavior === 'collapsible' ? '' : 'ml-64'} transition-all duration-300`}>
          {/* Menu Toggle Button (para menu suspenso) */}
          {menuSettings.behavior === 'collapsible' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="fixed top-4 left-4 z-50"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Modal de Configurações */}
        <MenuSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  // Menu Superior (padrão)
  return (
    <>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image
                  src={darkMode ? logoBranco : logoPreto}
                  alt="Financo"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Financo</span>
              </Link>

              {/* Desktop Navigation */}
              {menuSettings.behavior === 'fixed' && (
                <nav className="hidden md:flex items-center gap-6">
                  <NavigationItems />
                </nav>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={openSettings}
                className="hidden sm:flex items-center gap-2"
              >
                <Cog className="h-4 w-4" />
                <span className="hidden lg:inline">Configurações</span>
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Menu */}
              <div className="relative group">
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt={userName || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {(userName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                {/* User Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="p-2">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {userName || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                    
                    <button
                      onClick={openSettings}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile Menu Toggle */}
              {menuSettings.behavior === 'collapsible' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMobileMenu}
                  className="md:hidden"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {menuSettings.behavior === 'collapsible' && mobileMenuOpen && (
            <nav className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="space-y-2">
                <NavigationItems />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Modal de Configurações */}
      <MenuSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
