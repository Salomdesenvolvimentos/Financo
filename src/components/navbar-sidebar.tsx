// ============================================
// Componente: Sidebar (Estilo Copilot)
// Menu lateral limpo e organizado
// ============================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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
        className={`fixed left-0 top-0 h-full sidebar-gradient border-r border-border z-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="Voltar ao Dashboard">
            <Image
              src={darkMode ? logoBranco : logoPreto}
              alt="Financo"
              width={28}
              height={28}
              className="rounded-lg"
            />
            <span className="text-lg font-bold tracking-tight">Financo</span>
          </Link>
          
          {isCollapsible && (
            <button
              aria-label="Fechar menu"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5" aria-label="Menu principal">
          <div className="space-y-0.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isCollapsible ? onClose : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all group ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`} />
                  <span className="truncate">{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label="Menu do usuário"
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/60 transition-colors"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={userName || 'Usuário'}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-border"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-foreground)))' }}>
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{userName || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                userMenuOpen ? 'rotate-180' : ''
              }`} />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 right-0 mb-2 bg-card rounded-xl shadow-lg border border-border animate-scale-in overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={onToggleTheme}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted/60 flex items-center gap-3 transition-colors"
                >
                  {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
                  {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </button>
                
                <div className="h-px bg-border mx-2" />

                <button
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full px-4 py-2.5 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
