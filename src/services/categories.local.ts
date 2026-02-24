// ============================================
// FINACO - Serviços de Categorias (Modo Local)
// Wrapper que detecta modo local vs Supabase
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import { localDB } from '@/lib/local-storage';
import type { Category, CategoryFormData } from '@/types';

const isLocalMode = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost:54321');
};

/**
 * Busca todas as categorias do usuário
 */
export async function getCategories(userId: string) {
  try {
    if (isLocalMode()) {
      const categories = localDB.getCategories();
      return { data: categories, error: null };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('nome');

    if (error) throw error;

    return { data: data as Category[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Busca categorias por tipo (receita ou despesa)
 */
export async function getCategoriesByType(userId: string, tipo: 'receita' | 'despesa') {
  try {
    if (isLocalMode()) {
      const categories = localDB.getCategories().filter(c => c.tipo === tipo);
      return { data: categories, error: null };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', tipo)
      .order('nome');

    if (error) throw error;

    return { data: data as Category[], error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Cria uma nova categoria
 */
export async function createCategory(categoryData: CategoryFormData) {
  try {
    if (isLocalMode()) {
      const categories = localDB.getCategories();
      const user = localDB.getUser();
      const newCategory: Category = {
        id: `cat-${Date.now()}`,
        user_id: user?.id || 'local-user-123',
        ...categoryData,
        created_at: new Date().toISOString(),
      };
      categories.push(newCategory);
      localDB.setCategories(categories);
      return { data: newCategory, error: null };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;

    return { data: data as Category, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Atualiza uma categoria
 */
export async function updateCategory(categoryId: string, categoryData: Partial<CategoryFormData>) {
  try {
    if (isLocalMode()) {
      const categories = localDB.getCategories();
      const index = categories.findIndex(c => c.id === categoryId);
      if (index !== -1) {
        categories[index] = {
          ...categories[index],
          ...categoryData,
        };
        localDB.setCategories(categories);
        return { data: categories[index], error: null };
      }
      return { data: null, error: 'Categoria não encontrada' };
    }
    
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    return { data: data as Category, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Deleta uma categoria
 */
export async function deleteCategory(categoryId: string) {
  try {
    if (isLocalMode()) {
      const categories = localDB.getCategories();
      const filtered = categories.filter(c => c.id !== categoryId);
      localDB.setCategories(filtered);
      return { error: null };
    }
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
