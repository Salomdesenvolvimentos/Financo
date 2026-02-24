// ============================================
// FINACO - Serviços de Autenticação
// Funções para gerenciamento de autenticação
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import { localDB, DEFAULT_USER } from '@/lib/local-storage';

// Verifica se está usando modo local (sem Supabase)
const isLocalMode = () => {
  if (typeof window === 'undefined') return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('🔧 Verificando modo (auth):', url);
  return url?.includes('localhost:54321') || false;
};

/**
 * Realiza login com email e senha
 */
export async function signIn(email: string, password: string) {
  try {
    // Modo local: aceita qualquer email/senha e usa usuário de teste
    if (isLocalMode()) {
      console.log('🔐 Login em modo local');
      localDB.init();
      localDB.setUser(DEFAULT_USER);
      console.log('✅ Usuário salvo no localStorage:', DEFAULT_USER);
      return { 
        data: { 
          user: DEFAULT_USER,
          session: { access_token: 'local-token' }
        }, 
        error: null 
      };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Realiza cadastro de novo usuário
 */
export async function signUp(email: string, password: string, nome: string) {
  try {
    // Modo local: cria usuário de teste
    if (isLocalMode()) {
      localDB.init();
      const user = { ...DEFAULT_USER, email, nome };
      localDB.setUser(user);
      return { 
        data: { 
          user,
          session: { access_token: 'local-token' }
        }, 
        error: null 
      };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
        },
      },
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

/**
 * Realiza logout do usuário
 */
export async function signOut() {
  try {
    // Modo local: limpa localStorage
    if (isLocalMode()) {
      localDB.clear();
      return { error: null };
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Obtém o usuário atualmente autenticado
 */
export async function getCurrentUser() {
  try {
    // Modo local: retorna usuário do localStorage
    if (isLocalMode()) {
      const user = localDB.getUser();
      if (!user) {
        localDB.init();
        return { user: localDB.getUser(), error: null };
      }
      return { user, error: null };
    }
    
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

/**
 * Envia email de recuperação de senha
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

/**
 * Atualiza a senha do usuário
 */
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}
