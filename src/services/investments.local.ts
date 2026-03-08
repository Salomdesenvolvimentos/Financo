// ============================================
// FINACO - Services: Investimentos (Modo Local)
// CRUD via localStorage para carteira de investimentos
// ============================================

'use client';

import type { Investment, InvestmentFormData } from '@/types';

const STORAGE_KEY = 'finaco_investments';

function getAll(userId: string): Investment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Investment[] = raw ? JSON.parse(raw) : [];
    return all.filter((inv) => inv.user_id === userId && inv.ativo);
  } catch {
    return [];
  }
}

function saveAll(investments: Investment[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(investments));
}

export async function getInvestments(
  userId: string
): Promise<{ data: Investment[] | null; error: string | null }> {
  try {
    const data = getAll(userId).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function createInvestment(
  userId: string,
  form: InvestmentFormData
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Investment[] = raw ? JSON.parse(raw) : [];
    const now = new Date().toISOString();
    const newInvestment: Investment = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      ...form,
      created_at: now,
      updated_at: now,
    };
    all.push(newInvestment);
    saveAll(all);
    return { data: newInvestment, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function updateInvestment(
  id: string,
  form: Partial<InvestmentFormData>
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Investment[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((inv) => inv.id === id);
    if (idx === -1) return { data: null, error: 'Investimento não encontrado' };
    all[idx] = { ...all[idx], ...form, updated_at: new Date().toISOString() };
    saveAll(all);
    return { data: all[idx], error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

/**
 * Upsert por nome+instituicao+tipo: se já existir, atualiza; senão cria.
 * Evita duplicatas em reimportações do Pluggy.
 */
export async function upsertInvestment(
  userId: string,
  form: InvestmentFormData
): Promise<{ data: Investment | null; error: string | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Investment[] = raw ? JSON.parse(raw) : [];
    const existing = all.find(
      (inv) =>
        inv.user_id === userId &&
        inv.ativo &&
        inv.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() &&
        inv.tipo === form.tipo &&
        inv.instituicao.trim().toLowerCase() === form.instituicao.trim().toLowerCase()
    );
    if (existing) {
      const idx = all.findIndex((inv) => inv.id === existing.id);
      all[idx] = { ...all[idx], ...form, updated_at: new Date().toISOString() };
      saveAll(all);
      return { data: all[idx], error: null };
    }
    return createInvestment(userId, form);
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}

export async function deleteInvestment(
  id: string
): Promise<{ error: string | null }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Investment[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((inv) => inv.id === id);
    if (idx === -1) return { error: 'Investimento não encontrado' };
    all[idx] = { ...all[idx], ativo: false, updated_at: new Date().toISOString() };
    saveAll(all);
    return { error: null };
  } catch (err: any) {
    return { error: err.message };
  }
}
