// ============================================
// Componente: Sidebar (Estilo Copilot)
// Menu lateral limpo e organizado
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
  X,
  Sun,
  Moon,
  CreditCard,
  User,
  ChevronDown,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  isCollapsible: boolean;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  userName, 
  darkMode, 
  onToggleTheme,
  isCollapsible 
}: SidebarProps) {
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
      {/* Overlay para mobile */}
      {isCollapsible && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsible ? 'w-72' : 'w-72'}`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
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
          
          {isCollapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isCollapsible ? onClose : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={userName || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userName || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
                userMenuOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
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
    </>
  );
}
