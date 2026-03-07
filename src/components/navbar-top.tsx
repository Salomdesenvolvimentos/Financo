// ============================================
// Componente: Navbar Top
// Barra superior simplificada
// ============================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logoBranco from '@/Financo_branco.png';
import logoPreto from '@/Financo_preto.png';
import { Button } from '@/components/ui/button';
import { signOut } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
  User,
  ChevronDown,
} from 'lucide-react';

interface NavbarTopProps {
  userName?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  isCollapsible: boolean;
}

export function NavbarTop({ 
  userName, 
  darkMode, 
  onToggleTheme,
  onToggleMenu,
  isMenuOpen,
  isCollapsible 
}: NavbarTopProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Carregar foto de perfil
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  }, [user]);

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

  const navigationItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: Receipt,
      label: "Transações",
      href: "/dashboard/transactions",
    },
    {
      icon: CreditCard,
      label: "Gastos Fixos",
      href: "/dashboard/fixed-expenses",
    },
    {
      icon: DollarSign,
      label: "Rendas Fixas",
      href: "/dashboard/fixed-income",
    },
    {
      icon: Upload,
      label: "Importar",
      href: "/dashboard/import",
    },
    {
      icon: Settings,
      label: "Configurações",
      href: "/dashboard/settings",
    },
  ];

  return (
    <>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Menu Toggle */}
              {isCollapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleMenu}
                  className="p-2"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}

              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image
                  src={darkMode ? logoBranco : logoPreto}
                  alt="Financo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Financo</span>
              </Link>

              {/* Desktop Navigation */}
              {!isCollapsible && (
                <nav className="hidden md:flex items-center gap-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleTheme}
                className="p-2"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
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
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {userName || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    {/* Navigation Items */}
                    <div className="py-1 border-b border-gray-200 dark:border-gray-700">
                      {navigationItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                    
                    {/* Theme and Logout */}
                    <div className="py-1">
                      <button
                        onClick={onToggleTheme}
                        className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                      </button>
                      
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isCollapsible && isMenuOpen && (
            <nav className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onToggleMenu()}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>
    </>
  );
}
