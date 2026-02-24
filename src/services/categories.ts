// ============================================
// FINACO - Serviços de Categorias
// Funções para gerenciamento de categorias
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import type { Category, CategoryFormData } from '@/types';

/**
 * Busca todas as categorias do usuário
 */
export async function getCategories(userId: string) {
  try {
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
export async function createCategory(
  userId: string,
  formData: CategoryFormData
) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          user_id: userId,
          nome: formData.nome,
          tipo: formData.tipo,
          cor: formData.cor,
          icone: formData.icone,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { data: data as Category, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Atualiza uma categoria existente
 */
export async function updateCategory(
  id: string,
  formData: Partial<CategoryFormData>
) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(formData)
      .eq('id', id)
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
export async function deleteCategory(id: string) {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
