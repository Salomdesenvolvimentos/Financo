// ============================================
// Componente: Navbar Top
// Barra superior com grupos colapsÃ¡veis (espelha a Sidebar)
// ============================================

"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logoBranco from '@/Financo_branco.png';
import logoPreto from '@/Financo_preto.png';
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
  Wallet,
  User,
  ChevronDown,
  TrendingUp,
  Trophy,
  Users,
  Target,
  BarChart3,
  Sparkles,
} from 'lucide-react';

interface NavbarTopProps {
  userName?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  onToggleMenu: () => void;
  isMenuOpen: boolean;
  isCollapsible: boolean;
  hidden?: boolean;
  friendRequestCount?: number;
}

type NavItem  = { icon: React.ElementType; label: string; href: string };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };
type NavEntry = { type: 'item'; data: NavItem } | { type: 'group'; data: NavGroup };

const navEntries: NavEntry[] = [
  { type: 'item', data: { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' } },
  {
    type: 'group',
    data: {
      id: 'financas', label: 'Finanças', icon: BarChart3,
      items: [
        { icon: Receipt,    label: 'Transações',   href: '/dashboard/transactions'   },
        { icon: CreditCard, label: 'Gastos Fixos', href: '/dashboard/fixed-expenses' },
        { icon: DollarSign, label: 'Rendas Fixas', href: '/dashboard/fixed-income'   },
        { icon: Wallet,     label: 'Cartões',      href: '/dashboard/credit-cards'    },
      ],
    },
  },
  {
    type: 'group',
    data: {
      id: 'metas', label: 'Metas', icon: Sparkles,
      items: [
        { icon: TrendingUp, label: 'Investimentos',    href: '/dashboard/investments' },
        { icon: Trophy,     label: 'Desafios',         href: '/dashboard/challenges'  },
        { icon: Target,     label: 'Lista de Desejos', href: '/dashboard/wishlist'    },
      ],
    },
  },
  { type: 'item', data: { icon: Users,    label: 'Social',        href: '/dashboard/social'   } },
  { type: 'item', data: { icon: Upload,   label: 'Importar',      href: '/dashboard/import'   } },
  { type: 'item', data: { icon: Settings, label: 'Configurações', href: '/dashboard/settings' } },
];

export function NavbarTop({ 
  userName, 
  darkMode, 
  onToggleTheme,
  onToggleMenu,
  isMenuOpen,
  isCollapsible,
  hidden = false,
  friendRequestCount = 0,
}: NavbarTopProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar foto de perfil
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) setProfileImage(savedImage);
    }
  }, [user]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fechar dropdowns ao mudar de rota
  useEffect(() => {
    setOpenGroup(null);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." });
      router.push('/login');
    } catch {
      toast({ title: "Erro ao sair", description: "Ocorreu um erro ao tentar sair.", variant: "destructive" });
    }
  };

  function isGroupActive(group: NavGroup): boolean {
    return group.items.some(item => pathname === item.href || pathname.startsWith(item.href));
  }

  return (
    <>
      <header className={`glass border-b border-border fixed top-0 left-0 right-0 w-full z-[100] transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 relative" ref={dropdownRef}>

            {/* Left: menu toggle + logo */}
            <div className="flex items-center gap-3">
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
              <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="Voltar ao Dashboard">
                <Image src={darkMode ? logoPreto : logoBranco} alt="Financo" width={120} height={36} className="object-contain" />
              </Link>
            </div>

            {/* Center Navigation Desktop */}
            <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5" aria-label="Menu principal">
              {navEntries.map((entry) => {
                if (entry.type === 'item') {
                  const item = entry.data as NavItem;
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                      <span>{item.label}</span>
                      {item.href === '/dashboard/social' && friendRequestCount > 0 && (
                        <span className="min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {friendRequestCount}
                        </span>
                      )}
                    </Link>
                  );
                }

                // Grupo com dropdown
                const group = entry.data as NavGroup;
                const GroupIcon = group.icon;
                const active = isGroupActive(group);
                const isOpen = openGroup === group.id;

                return (
                  <div key={group.id} className="relative">
                    <button
                      onClick={() => setOpenGroup(isOpen ? null : group.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <GroupIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : ''}`} />
                      <span>{group.label}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="absolute top-full mt-1.5 left-0 min-w-[180px] bg-card border border-border rounded-xl shadow-lg z-[200] py-1.5 overflow-hidden animate-scale-in">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                                isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                              }`}
                            >
                              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Right: theme + user */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
                onClick={onToggleTheme}
                className="p-2 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
              >
                {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Menu do usuário"
                  className="flex items-center gap-1.5 p-1.5 rounded-xl hover:bg-muted/60 transition-colors"
                >
                  {profileImage ? (
                    <img src={profileImage} alt={userName || 'Usuário'} className="w-7 h-7 rounded-full object-cover ring-2 ring-border" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-border" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-foreground)))' }}>
                      <User className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border animate-scale-in overflow-hidden z-[300]">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-semibold truncate">{userName || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button role="menuitem" onClick={onToggleTheme} className="w-full px-4 py-2 text-sm text-left hover:bg-muted/60 flex items-center gap-3 transition-colors">
                        {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
                        {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                      </button>
                      <button role="menuitem" onClick={handleSignOut} className="w-full px-4 py-2 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-3 transition-colors">
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
                {navEntries.map((entry) => {
                  if (entry.type === 'item') {
                    const item = entry.data as NavItem;
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={onToggleMenu}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                          isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.label}</span>
                        {item.href === '/dashboard/social' && friendRequestCount > 0 && (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {friendRequestCount}
                          </span>
                        )}
                      </Link>
                    );
                  }

                  const group = entry.data as NavGroup;
                  const GroupIcon = group.icon;
                  const active = isGroupActive(group);
                  const expanded = mobileExpandedGroup === group.id;

                  return (
                    <div key={group.id}>
                      <button
                        onClick={() => setMobileExpandedGroup(expanded ? null : group.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                          active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                        }`}
                      >
                        <GroupIcon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
                        <span className="flex-1 text-left">{group.label}</span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && (
                        <div className="ml-7 mt-0.5 space-y-0.5">
                          {group.items.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || pathname.startsWith(item.href);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={onToggleMenu}
                                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all ${
                                  isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                              >
                                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : ''}`} />
                                {item.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
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

