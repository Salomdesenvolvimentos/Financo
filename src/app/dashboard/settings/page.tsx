// ============================================
// Página: Configurações
// Página de configurações do sistema
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
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
import { User, Settings, Tag, Trash2, Plus, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form para nova categoria
  const [newCategory, setNewCategory] = useState<CategoryFormData>({
    nome: '',
    tipo: 'despesa',
    cor: '#3B82F6',
  });

  useEffect(() => {
    if (!user) return;

    async function loadCategories() {
      const { data } = await getCategories(user.id);
      if (data) setCategories(data);
    }

    loadCategories();
  }, [user]);

  const handleCreateCategory = async () => {
    if (!user || !newCategory.nome) return;

    setLoading(true);
    const categoryToCreate = { ...newCategory, user_id: user.id };
    const { error } = await createCategory(categoryToCreate as any);

    if (error) {
      toast({
        title: 'Erro ao criar categoria',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Categoria criada!',
        variant: 'success',
      });

      // Recarregar categorias
      const { data } = await getCategories(user.id);
      if (data) setCategories(data);

      // Limpar form
      setNewCategory({
        nome: '',
        tipo: 'despesa',
        cor: '#3B82F6',
      });
    }

    setLoading(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    setLoading(true);
    const { error } = await deleteCategory(id);

    if (error) {
      toast({
        title: 'Erro ao excluir categoria',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Categoria excluída!',
        variant: 'success',
      });

      // Recarregar categorias
      const { data } = await getCategories(user!.id);
      if (data) setCategories(data);
    }

    setLoading(false);
  };

  const despesas = categories.filter((c) => c.tipo === 'despesa');
  const receitas = categories.filter((c) => c.tipo === 'receita');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e categorias
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" />
            Categorias
          </TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Suas informações pessoais e de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={user?.user_metadata?.nome || ''}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email || ''} disabled />
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  Para alterar suas informações, entre em contato com o suporte.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categories" className="space-y-4">
          {/* Criar Nova Categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Nova Categoria</CardTitle>
              <CardDescription>
                Crie categorias personalizadas para organizar suas transações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    value={newCategory.nome}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, nome: e.target.value })
                    }
                    placeholder="Ex: Transporte"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    value={newCategory.tipo}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        tipo: e.target.value as 'receita' | 'despesa',
                      })
                    }
                    className="w-full h-10 px-3 border rounded-md"
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <div className="flex gap-2">
                    <input
                      id="cor"
                      type="color"
                      value={newCategory.cor}
                      onChange={(e) =>
                        setNewCategory({ ...newCategory, cor: e.target.value })
                      }
                      className="h-10 w-20 border rounded cursor-pointer"
                    />
                    <Button
                      onClick={handleCreateCategory}
                      disabled={loading || !newCategory.nome}
                      className="flex-1"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categorias de Despesa */}
          <Card>
            <CardHeader>
              <CardTitle>Categorias de Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {despesas.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="font-medium">{cat.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {despesas.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma categoria de despesa
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categorias de Receita */}
          <Card>
            <CardHeader>
              <CardTitle>Categorias de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {receitas.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className="font-medium">{cat.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {receitas.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma categoria de receita
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
