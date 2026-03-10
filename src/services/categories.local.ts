// ============================================
// FINACO - Serviços de Categorias
// CRUD via Supabase para categorias
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
export async function createCategory(categoryData: CategoryFormData) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Usuário não autenticado');
    
    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...categoryData, user_id: userData.user.id }])
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
