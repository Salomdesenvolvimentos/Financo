// ============================================
// Componente: Navbar
// Barra de navegação principal
// ============================================

"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// If the project contains the logo under `src/`, import it so Next can serve it.
// importar ambas as variantes da logo (nomeadas conforme solicitação)
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
} from 'lucide-react';

interface NavbarProps {
  userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Carregar foto de perfil do localStorage
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    // Forçar reload para limpar estado
    window.location.href = '/';
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/transactions', label: 'Transações', icon: Receipt },
    { href: '/dashboard/fixed-expenses', label: 'Gastos Fixos', icon: CreditCard },
    { href: '/dashboard/fixed-income', label: 'Rendas Fixas', icon: DollarSign },
    { href: '/dashboard/import', label: 'Importar', icon: Upload },
    { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center space-x-2 mr-8">
          {/* mostrar a imagem atualizada segundo o modo (claro/escuro) */}
          <Image
            src={darkMode ? logoBranco : logoPreto}
            alt="Financo"
            width={108}
            height={108}
            className="object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button 
                key={item.href} 
                variant="ghost" 
                className="gap-2"
                onClick={() => router.push(item.href)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="hidden md:flex"
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* User Info */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-muted">
            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-border">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <span className="text-sm font-medium">{userName || 'Usuário'}</span>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="hidden md:flex"
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button 
                  key={item.href}
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push(item.href);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
