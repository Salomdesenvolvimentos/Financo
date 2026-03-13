// ============================================
// Componente: Sidebar (Estilo Copilot)
// Menu lateral com grupos colapsáveis e hover flyout
// ============================================

"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logoBranco from '@/Financo_branco.png';
import logoPreto from '@/Financo_preto.png';
import { Button } from '@/components/ui/button';
import { signOut } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { usePlan } from '@/hooks/use-plan';
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
  Wallet,
  User,
  ChevronRight,
  TrendingUp,
  Trophy,
  Crown,
  Shield,
  Users,
  Target,
  BarChart3,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  isCollapsible: boolean;
  friendRequestCount?: number;
}

export function Sidebar({ 
  isOpen, 
  onClose, 
  userName, 
  darkMode, 
  onToggleTheme,
  isCollapsible,
  friendRequestCount = 0,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isPremium } = usePlan();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Grupos colapsáveis
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Hover flyout portal
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [flyoutY, setFlyoutY] = useState(0);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estrutura de grupos do menu
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
          { icon: Receipt,    label: 'Transações',    href: '/dashboard/transactions'    },
          { icon: CreditCard, label: 'Gastos Fixos',  href: '/dashboard/fixed-expenses'  },
          { icon: DollarSign, label: 'Rendas Fixas',  href: '/dashboard/fixed-income'    },
          { icon: Wallet,     label: 'Cartões',         href: '/dashboard/credit-cards'     },
        ],
      },
    },
    {
      type: 'group',
      data: {
        id: 'metas', label: 'Metas', icon: Sparkles,
        items: [
          { icon: TrendingUp, label: 'Investimentos',     href: '/dashboard/investments' },
          { icon: Trophy,     label: 'Desafios',          href: '/dashboard/challenges'  },
          { icon: Target,     label: 'Lista de Desejos',  href: '/dashboard/wishlist'    },
        ],
      },
    },
    { type: 'item', data: { icon: Users,    label: 'Social',        href: '/dashboard/social'   } },
    { type: 'item', data: { icon: Upload,   label: 'Importar',      href: '/dashboard/import'   } },
    { type: 'item', data: { icon: Settings, label: 'Configurações', href: '/dashboard/settings' } },
  ];

  // Auto-expandir grupo que contém rota ativa
  useEffect(() => {
    const activeGroups = new Set<string>();
    navEntries.forEach(entry => {
      if (entry.type === 'group') {
        const g = entry.data as NavGroup;
        if (g.items.some(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)))) {
          activeGroups.add(g.id);
        }
      }
    });
    setExpandedGroups(activeGroups);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Expandir/recolher grupos para o tour interativo
  useEffect(() => {
    const expand = () => setExpandedGroups(new Set(['financas', 'metas']));
    const collapse = () => {
      const active = new Set<string>();
      navEntries.forEach(e => {
        if (e.type === 'group') {
          const g = e.data as NavGroup;
          if (g.items.some(i => pathname === i.href || pathname.startsWith(i.href))) active.add(g.id);
        }
      });
      setExpandedGroups(active);
    };
    window.addEventListener('financo:tour-start', expand);
    window.addEventListener('financo:tour-end', collapse);
    return () => {
      window.removeEventListener('financo:tour-start', expand);
      window.removeEventListener('financo:tour-end', collapse);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onGroupMouseEnter = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyoutY(rect.top);
    setHoveredGroup(id);
  };
  const onGroupMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHoveredGroup(null), 120);
  };
  const onFlyoutMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };
  const onFlyoutMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setHoveredGroup(null), 120);
  };

  // Carregar foto de perfil
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) setProfileImage(savedImage);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Logout realizado', description: 'Você foi desconectado com sucesso.' });
      router.push('/login');
    } catch {
      toast({ title: 'Erro ao sair', description: 'Ocorreu um erro ao tentar sair.', variant: 'destructive' });
    }
  };

  const premiumItem = {
    icon: Crown,
    label: isPremium ? 'Premium ativo' : 'Assinar Premium',
    href: '/dashboard/subscription',
    highlight: !isPremium,
  };

  const isItemActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <>
      {/* Overlay mobile */}
      {isCollapsible && isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        id="tour-sidebar"
        className={`fixed left-0 top-0 h-full sidebar-gradient border-r border-border z-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" aria-label="Voltar ao Dashboard">
            <Image src={darkMode ? logoPreto : logoBranco} alt="Financo" width={110} height={32} className="object-contain" />
          </Link>
          {isCollapsible && (
            <button aria-label="Fechar menu" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-visible" aria-label="Menu principal" style={{ maxHeight: 'calc(100% - 8rem)' }}>
          <div className="space-y-0.5">
            {navEntries.map((entry, idx) => {
              if (entry.type === 'item') {
                const { icon: Icon, label, href } = entry.data as NavItem;
                const active = isItemActive(href);
                const tourId = href.split('/').pop();
                return (
                  <Link
                    id={`tour-nav-${tourId}`}
                    key={href}
                    href={href}
                    onClick={isCollapsible ? onClose : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                    <span className="truncate">{label}</span>
                    {href === '/dashboard/social' && friendRequestCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {friendRequestCount}
                      </span>
                    )}
                    {active && href !== '/dashboard/social' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                    {active && href === '/dashboard/social' && friendRequestCount === 0 && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                  </Link>
                );
              }

              // Grupo colapsável
              const group = entry.data as NavGroup;
              const { id, label, icon: GroupIcon, items } = group;
              const isExpanded = expandedGroups.has(id);
              const hasActive = items.some(item => isItemActive(item.href));

              return (
                <div
                  key={id}
                  onMouseEnter={e => onGroupMouseEnter(id, e)}
                  onMouseLeave={onGroupMouseLeave}
                >
                  {/* Cabeçalho do grupo */}
                  <button
                    id={`tour-group-${id}`}
                    onClick={() => toggleGroup(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                      hasActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                    aria-expanded={isExpanded}
                  >
                    <GroupIcon className={`h-4 w-4 flex-shrink-0 ${hasActive ? 'text-primary' : ''}`} />
                    <span className="truncate flex-1 text-left">{label}</span>
                    {hasActive && !isExpanded && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Itens expandidos inline */}
                  {isExpanded && (
                    <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5 pb-1">
                      {items.map(item => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item.href);
                        const subId = item.href.split('/').pop();
                        return (
                          <Link
                            id={`tour-nav-${subId}`}
                            key={item.href}
                            href={item.href}
                            onClick={isCollapsible ? onClose : undefined}
                            aria-current={active ? 'page' : undefined}
                            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl transition-all ${
                              active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <ItemIcon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                            <span className="truncate">{item.label}</span>
                            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Separador */}
            <div className="h-px bg-border mx-1 my-2" />

            {/* Premium */}
            {(() => {
              const active = isItemActive(premiumItem.href);
              return (
                <Link
                  href={premiumItem.href}
                  onClick={isCollapsible ? onClose : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                    active ? 'bg-accent text-accent-foreground' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                  }`}
                >
                  <Crown className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : 'text-amber-500'}`} />
                  <span className="truncate">{premiumItem.label}</span>
                  {!active && (
                    <span className="ml-auto text-[10px] font-semibold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                      PRO
                    </span>
                  )}
                </Link>
              );
            })()}

            {/* Admin */}
            {user?.email === 'salomdesenvolvimentos@hotmail.com' && (
              <Link
                href="/dashboard/admin"
                onClick={isCollapsible ? onClose : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isItemActive('/dashboard/admin') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            {/* Avatar + nome */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 p-1.5">
              {profileImage ? (
                <img src={profileImage} alt={userName || 'Usuário'} width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-border" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-border"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-foreground)))' }}>
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{userName || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Modo escuro */}
            <button
              onClick={onToggleTheme}
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="p-2 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-blue-500" />}
            </button>

            {/* Sair */}
            <button
              onClick={handleSignOut}
              aria-label="Sair da conta"
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Flyout portal — aparece ao passar o mouse num grupo não expandido */}
      {typeof window !== 'undefined' && hoveredGroup && !expandedGroups.has(hoveredGroup) &&
        createPortal(
          <div
            style={{ position: 'fixed', left: 268, top: flyoutY, zIndex: 9999 }}
            className="bg-card border border-border rounded-xl shadow-xl py-2 w-52 animate-scale-in"
            onMouseEnter={onFlyoutMouseEnter}
            onMouseLeave={onFlyoutMouseLeave}
          >
            {(() => {
              const grp = navEntries.find(e => e.type === 'group' && (e.data as NavGroup).id === hoveredGroup)?.data as NavGroup | undefined;
              if (!grp) return null;
              return (
                <>
                  <p className="px-3 pb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">{grp.label}</p>
                  {grp.items.map(item => {
                    const ItemIcon = item.icon;
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => { setHoveredGroup(null); if (isCollapsible) onClose(); }}
                        className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted/60 ${active ? 'text-primary font-semibold' : 'text-foreground'}`}
                      >
                        <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </>
              );
            })()}
          </div>,
          document.body
        )
      }
    </>
  );
}


