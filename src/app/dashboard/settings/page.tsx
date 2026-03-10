// ============================================
// Página: Configurações
// Página unificada de configurações do sistema
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMenuSettings } from '@/hooks/use-menu-settings';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/hooks/use-plan';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCategories, createCategory, deleteCategory } from '@/services/categories.local';
import type { Category, CategoryFormData } from '@/types';
import { 
  User, 
  Settings as SettingsIcon, 
  Tag, 
  Trash2, 
  Plus, 
  Loader2, 
  Camera,
  Layout,
  Menu as MenuIcon,
  Sun,
  Moon,
  Check,
  X,
  Palette,
  Monitor,
  Crown,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
];

export default function SettingsPageNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings: menuSettings, updatePosition, updateBehavior } = useMenuSettings();
  const { isPremium } = usePlan();
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form para nova categoria
  const [newCategory, setNewCategory] = useState<CategoryFormData>({
    nome: '',
    tipo: 'despesa',
    cor: '#3B82F6',
  });

  // Carregar dados
  useEffect(() => {
    if (user?.id) {
      const savedImage = localStorage.getItem(`profile-image-${user.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }

      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setDarkMode(true);
      }
    }
  }, [user]);

  // Carregar categorias
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getCategories(user?.id || '');
        if (result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };

    loadCategories();
  }, [user]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingImage(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      localStorage.setItem(`profile-image-${user.id}`, result);
      setProfileImage(result);
      setUploadingImage(false);
      
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    };

    reader.onerror = () => {
      setUploadingImage(false);
      toast({
        title: "Erro ao fazer upload",
        description: "Não foi possível processar a imagem.",
        variant: "destructive",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.nome.trim() || !user?.id) return;

    // Atualização otimista: adicionar imediatamente à lista com ID temporário
    const tempId = `temp-${Date.now()}`;
    const optimisticItem: Category = {
      id: tempId,
      user_id: user.id,
      nome: newCategory.nome.trim(),
      tipo: newCategory.tipo,
      cor: newCategory.cor,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [optimisticItem, ...prev]);
    const savedForm = { ...newCategory };
    setNewCategory({ nome: '', tipo: 'despesa', cor: '#3B82F6' });

    setSavingCategory(true);
    try {
      await createCategory(savedForm);
      // Sincronizar com servidor para obter ID real
      const result = await getCategories(user.id);
      if (result.data) setCategories(result.data);
      toast({ title: "Categoria criada", description: `"${savedForm.nome}" adicionada com sucesso.` });
    } catch (error) {
      // Reverter otimismo em caso de erro
      setCategories((prev) => prev.filter((c) => c.id !== tempId));
      setNewCategory(savedForm);
      toast({ title: "Erro ao criar categoria", description: "Não foi possível criar a categoria.", variant: "destructive" });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.id) return;

    // Atualização otimista: remover imediatamente
    const removed = categories.find((c) => c.id === categoryId);
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setDeletingId(categoryId);

    try {
      await deleteCategory(categoryId);
      toast({ title: "Categoria excluída", description: "Categoria removida com sucesso." });
    } catch (error) {
      // Reverter em caso de erro
      if (removed) setCategories((prev) => [...prev, removed]);
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir a categoria.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
    
    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${newDarkMode ? 'escuro' : 'claro'}.`,
    });
  };

  return (
    <div className="container max-w-3xl py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize sua experiência no Financo</p>
      </div>

      {/* ── Perfil ── */}
      <section aria-labelledby="section-profile">
        <h2 id="section-profile" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Perfil</h2>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              {/* Avatar com overlay de upload */}
              <div className="relative group flex-shrink-0">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={`Foto de perfil de ${user?.nome || 'usuário'}`}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center ring-2 ring-border"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-foreground)))' }}
                    aria-hidden="true"
                  >
                    <User className="h-9 w-9 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  aria-label="Alterar foto de perfil"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  {uploadingImage
                    ? <Loader2 className="h-6 w-6 text-white animate-spin" />
                    : <Camera className="h-6 w-6 text-white" />}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{user?.nome || user?.email || 'Usuário'}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {uploadingImage ? 'Processando...' : 'Trocar foto'}
                </button>
              </div>

              <Input
                ref={fileInputRef}
                id="profile-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                aria-label="Selecionar foto de perfil"
                disabled={uploadingImage}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Aparência ── */}
      <section aria-labelledby="section-appearance">
        <h2 id="section-appearance" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Aparência</h2>
        <Card className="card-hover">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">Tema</p>
                  <p className="text-xs text-muted-foreground">{darkMode ? 'Modo escuro ativo' : 'Modo claro ativo'}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                aria-label="Alternar tema escuro"
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  darkMode ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Menu ── */}
      <section aria-labelledby="section-menu">
        <h2 id="section-menu" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Menu de Navegação</h2>

        {!isPremium && (
          <div className="mb-3 flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-sm">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-200 flex-1">
              Personalização do menu é exclusiva do plano <strong>Premium</strong>.
            </span>
            <Link href="/dashboard/subscription">
              <Button size="sm" variant="outline" className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900">
                <Crown className="h-3.5 w-3.5" />
                Fazer upgrade
              </Button>
            </Link>
          </div>
        )}

        <div className={`grid gap-4 sm:grid-cols-2 ${!isPremium ? 'opacity-50 pointer-events-none select-none' : ''}`}>
          <Card className="card-hover">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Layout className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Posição</span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Posição do menu">
                {(['top', 'side'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    aria-pressed={menuSettings.position === pos}
                    onClick={() => updatePosition(pos)}
                    disabled={!isPremium}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      menuSettings.position === pos
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    {pos === 'top'
                      ? <div className="w-10 h-1.5 bg-current rounded-full" />
                      : <div className="w-1.5 h-8 bg-current rounded-full" />}
                    {pos === 'top' ? 'Topo' : 'Lateral'}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <MenuIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Comportamento</span>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Comportamento do menu">
                {(['fixed', 'collapsible'] as const).map((beh) => (
                  <button
                    key={beh}
                    type="button"
                    aria-pressed={menuSettings.behavior === beh}
                    onClick={() => updateBehavior(beh)}
                    disabled={!isPremium}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      menuSettings.behavior === beh
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border hover:border-primary/40 text-muted-foreground'
                    }`}
                  >
                    {beh === 'fixed'
                      ? <div className="w-7 h-7 bg-current rounded-md" />
                      : <div className="w-7 h-7 border-2 border-current rounded-md" />}
                    {beh === 'fixed' ? 'Fixo' : 'Suspenso'}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}


