'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createCategory } from '@/services/categories.local';
import type { CategoryFormData } from '@/types';
import { Plus, Loader2, X, Tag, Palette } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: () => void;
  defaultType?: 'receita' | 'despesa';
}

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
];

export function CategoryModal({ isOpen, onClose, onCategoryCreated, defaultType = 'despesa' }: CategoryModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    nome: '',
    tipo: defaultType,
    cor: '#3B82F6',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !user?.id) return;

    setLoading(true);
    try {
      await createCategory(formData);
      
      // Disparar evento para atualizar outras páginas
      window.dispatchEvent(new Event('categoriesUpdated'));
      
      // Resetar formulário
      setFormData({ nome: '', tipo: defaultType, cor: '#3B82F6' });
      
      toast({
        title: "Categoria criada",
        description: `"${formData.nome}" adicionada com sucesso.`,
      });
      
      onCategoryCreated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao criar categoria",
        description: error?.message || "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Nova Categoria
          </DialogTitle>
          <DialogDescription>
            Adicione uma categoria para organizar suas transações
          </DialogDescription>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Categoria *</Label>
            <Input
              id="nome"
              placeholder="Ex: Restaurante, Transporte..."
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="h-9"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'despesa' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  formData.tipo === 'despesa'
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}
                disabled={loading}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'receita' })}
                className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  formData.tipo === 'receita'
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted'
                }`}
                disabled={loading}
              >
                Receita
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, cor: color })}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      formData.cor === color ? 'border-primary' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    disabled={loading}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                className="w-12 h-6 p-1 rounded cursor-pointer"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.nome.trim()}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {loading ? 'Salvando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
