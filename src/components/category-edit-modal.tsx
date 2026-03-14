'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/categories.local';
import type { Category } from '@/types';
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from 'lucide-react';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#1F2937', '#6366F1',
];

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void;
  defaultType?: 'receita' | 'despesa';
}

interface EditRow {
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
}

export function CategoryEditModal({ isOpen, onClose, onChanged, defaultType = 'despesa' }: CategoryEditModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<EditRow>({ nome: '', tipo: 'despesa', cor: '#3B82F6' });
  const [newRow, setNewRow] = useState<EditRow>({ nome: '', tipo: defaultType, cor: '#3B82F6' });
  const [addingNew, setAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const r = await getCategories(user.id);
    if (r.data) setCategories(r.data);
    setLoading(false);
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen, user?.id]);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditRow({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor });
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (id: string) => {
    if (!editRow.nome.trim()) return;
    setSaving(true);
    const r = await updateCategory(id, editRow);
    if (r.error) {
      toast({ title: 'Erro ao salvar', description: r.error, variant: 'destructive' });
    } else {
      window.dispatchEvent(new Event('categoriesUpdated'));
      onChanged();
      await load();
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Excluir categoria "${cat.nome}"? Transações vinculadas perderão a categoria.`)) return;
    const r = await deleteCategory(cat.id);
    if (r.error) {
      toast({ title: 'Erro ao excluir', description: r.error, variant: 'destructive' });
    } else {
      window.dispatchEvent(new Event('categoriesUpdated'));
      onChanged();
      await load();
    }
  };

  const handleCreate = async () => {
    if (!newRow.nome.trim()) return;
    setSaving(true);
    const r = await createCategory(newRow);
    if (r.error) {
      toast({ title: 'Erro ao criar', description: r.error, variant: 'destructive' });
    } else {
      window.dispatchEvent(new Event('categoriesUpdated'));
      onChanged();
      await load();
      setNewRow({ nome: '', tipo: defaultType, cor: '#3B82F6' });
      setAddingNew(false);
    }
    setSaving(false);
  };

  const despesas = categories.filter(c => c.tipo === 'despesa');
  const receitas = categories.filter(c => c.tipo === 'receita');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" /> Editar Categorias
          </DialogTitle>
          <DialogDescription>
            Gerencie suas categorias de receitas e despesas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Despesas */}
              <CategorySection
                title="Despesas"
                color="danger"
                categories={despesas}
                editingId={editingId}
                editRow={editRow}
                saving={saving}
                onEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onDelete={handleDelete}
                setEditRow={setEditRow}
              />

              {/* Receitas */}
              <CategorySection
                title="Receitas"
                color="success"
                categories={receitas}
                editingId={editingId}
                editRow={editRow}
                saving={saving}
                onEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onDelete={handleDelete}
                setEditRow={setEditRow}
              />

              {/* Adicionar nova */}
              {addingNew ? (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  <p className="text-sm font-medium">Nova Categoria</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={newRow.nome}
                        onChange={e => setNewRow({ ...newRow, nome: e.target.value })}
                        placeholder="Ex: Alimentação"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setAddingNew(false); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newRow.tipo} onValueChange={v => setNewRow({ ...newRow, tipo: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="despesa">Despesa</SelectItem>
                          <SelectItem value="receita">Receita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button"
                          onClick={() => setNewRow({ ...newRow, cor: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${newRow.cor === c ? 'border-primary scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                      <input type="color" value={newRow.cor}
                        onChange={e => setNewRow({ ...newRow, cor: e.target.value })}
                        className="w-6 h-6 rounded-full cursor-pointer border" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setAddingNew(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleCreate} disabled={saving || !newRow.nome.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" />Salvar</>}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setAddingNew(true)}>
                  <Plus className="h-4 w-4" /> Nova Categoria
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end pt-3 border-t">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  title, color, categories, editingId, editRow, saving,
  onEdit, onCancelEdit, onSaveEdit, onDelete, setEditRow,
}: {
  title: string;
  color: 'danger' | 'success';
  categories: Category[];
  editingId: string | null;
  editRow: EditRow;
  saving: boolean;
  onEdit: (cat: Category) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (cat: Category) => void;
  setEditRow: (r: EditRow) => void;
}) {
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold uppercase tracking-wide ${color === 'danger' ? 'text-danger' : 'text-success'}`}>
        {title}
      </p>
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 pl-1">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {categories.map((cat, idx) => (
            <div key={cat.id} className={`flex items-center gap-3 px-3 py-2 ${idx !== 0 ? 'border-t' : ''} ${editingId === cat.id ? 'bg-muted/30' : 'hover:bg-muted/20'} transition-colors`}>
              {editingId === cat.id ? (
                <>
                  <input type="color" value={editRow.cor}
                    onChange={e => setEditRow({ ...editRow, cor: e.target.value })}
                    className="w-6 h-6 rounded-full cursor-pointer border flex-shrink-0" />
                  <Input
                    className="h-7 text-sm flex-1"
                    value={editRow.nome}
                    onChange={e => setEditRow({ ...editRow, nome: e.target.value })}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(cat.id); if (e.key === 'Escape') onCancelEdit(); }}
                  />
                  <Select value={editRow.tipo} onValueChange={v => setEditRow({ ...editRow, tipo: v as any })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success" onClick={() => onSaveEdit(cat.id)} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                  <span className="text-sm flex-1">{cat.nome}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${cat.tipo === 'despesa' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                    {cat.tipo === 'despesa' ? 'Despesa' : 'Receita'}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => onEdit(cat)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => onDelete(cat)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
