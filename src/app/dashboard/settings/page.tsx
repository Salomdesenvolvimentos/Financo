// ============================================
// Página: Configurações
// Página unificada de configurações do sistema
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMenuSettings, MenuPosition, MenuBehavior } from '@/hooks/use-menu-settings';
import { useToast } from '@/hooks/use-toast';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Moon
} from 'lucide-react';

export default function SettingsPageNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings: menuSettings, updatePosition, updateBehavior } = useMenuSettings();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

    setLoading(true);
    try {
      await createCategory(newCategory);
      setNewCategory({ nome: '', tipo: 'despesa', cor: '#3B82F6' });
      
      // Recarregar categorias
      const result = await getCategories(user.id);
      if (result.data) {
        setCategories(result.data);
      }

      toast({
        title: "Categoria criada",
        description: `Categoria "${newCategory.nome}" criada com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar categoria",
        description: "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.id) return;

    try {
      await deleteCategory(categoryId);
      
      // Recarregar categorias
      const result = await getCategories(user.id);
      if (result.data) {
        setCategories(result.data);
      }

      toast({
        title: "Categoria excluída",
        description: "Categoria excluída com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir categoria",
        description: "Não foi possível excluir a categoria.",
        variant: "destructive",
      });
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
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência e gerencie suas preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="appearance">Aparência</TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Altere sua foto de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Perfil"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-10 w-10 text-white" />
                  </div>
                )}
                
                <div className="flex-1">
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {uploadingImage ? 'Enviando...' : 'Alterar Foto'}
                    </div>
                  </Label>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Menu */}
        <TabsContent value="menu">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Posição do Menu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Posição do Menu
                </CardTitle>
                <CardDescription>
                  Escolha onde o menu de navegação deve aparecer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={menuSettings.position === 'top' ? 'default' : 'outline'}
                    onClick={() => updatePosition('top')}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-1 bg-current rounded" />
                    Topo
                  </Button>
                  <Button
                    variant={menuSettings.position === 'side' ? 'default' : 'outline'}
                    onClick={() => updatePosition('side')}
                    className="flex items-center gap-2"
                  >
                    <div className="w-1 h-4 bg-current rounded" />
                    Lateral
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Comportamento do Menu */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MenuIcon className="h-5 w-5" />
                  Comportamento do Menu
                </CardTitle>
                <CardDescription>
                  Escolha como o menu deve se comportar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={menuSettings.behavior === 'fixed' ? 'default' : 'outline'}
                    onClick={() => updateBehavior('fixed')}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 bg-current rounded" />
                    Fixo
                  </Button>
                  <Button
                    variant={menuSettings.behavior === 'collapsible' ? 'default' : 'outline'}
                    onClick={() => updateBehavior('collapsible')}
                    className="flex items-center gap-2"
                  >
                    <div className="w-4 h-4 border-2 border-current rounded" />
                    Suspenso
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba Categorias */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categorias
              </CardTitle>
              <CardDescription>
                Gerencie suas categorias de despesas e receitas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nova Categoria */}
              <div className="space-y-3">
                <Label htmlFor="new-category">Nova Categoria</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-category"
                    placeholder="Nome da categoria"
                    value={newCategory.nome}
                    onChange={(e) => setNewCategory({ ...newCategory, nome: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreateCategory}
                    disabled={loading || !newCategory.nome.trim()}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Lista de Categorias */}
              <div className="space-y-2">
                <Label>Categorias Existentes</Label>
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma categoria cadastrada
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: category.cor }}
                          />
                          <span className="font-medium">{category.nome}</span>
                          <span className="text-sm text-muted-foreground capitalize">
                            {category.tipo}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Aparência */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize o visual do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Tema</Label>
                  <p className="text-sm text-muted-foreground">
                    {darkMode ? 'Modo escuro' : 'Modo claro'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleTheme}
                  className="flex items-center gap-2"
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
