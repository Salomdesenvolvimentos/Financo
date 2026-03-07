// ============================================
// Componente: Navbar Top
// Barra superior simplificada
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
      {/* Header */}
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              {/* Menu Toggle */}
              {isCollapsible && (
                <button
                  aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                  aria-expanded={isMenuOpen}
                  onClick={onToggleMenu}
                  className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}

              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Voltar ao Dashboard">
                <Image
                  src={darkMode ? logoBranco : logoPreto}
                  alt="Financo"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="text-base font-bold tracking-tight">Financo</span>
              </Link>

              {/* Desktop Navigation */}
              {!isCollapsible && (
                <nav className="hidden md:flex items-center gap-0.5 ml-2" aria-label="Menu principal">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                onClick={onToggleTheme}
                className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Menu do usuário"
                  className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-muted/60 transition-colors"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={userName || 'Usuário'}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-border"
                      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-foreground)))' }}
                    >
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border animate-scale-in overflow-hidden"
                  >
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-semibold truncate">{userName || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    
                    {/* Navigation Items (mobile/dropdown) */}
                    <div className="py-1 border-b border-border">
                      {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setUserMenuOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                              isActive ? 'text-primary font-medium bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
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
                        role="menuitem"
                        onClick={onToggleTheme}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-muted/60 flex items-center gap-3 transition-colors"
                      >
                        {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
                        {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                      </button>
                      
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-colors"
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
            <nav className="md:hidden border-t border-border py-3" aria-label="Menu mobile">
              <div className="space-y-0.5">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onToggleMenu()}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
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
