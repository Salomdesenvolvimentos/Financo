/**
 * Sistema de armazenamento local para modo de demonstração
 * Simula autenticação e banco de dados usando localStorage
 */

import { User, Category, Transaction, Insight } from '@/types';

const KEYS = {
  USER: 'finaco_user',
  CATEGORIES: 'finaco_categories',
  TRANSACTIONS: 'finaco_transactions',
  INSIGHTS: 'finaco_insights',
};

// Usuário de teste padrão
export const DEFAULT_USER: User = {
  id: 'local-user-123',
  email: 'teste@finaco.com',
  nome: 'Usuário Teste',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Categorias padrão
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    user_id: DEFAULT_USER.id,
    nome: 'Alimentação',
    tipo: 'despesa',
    cor: '#ef4444',
    icone: '🍔',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    user_id: DEFAULT_USER.id,
    nome: 'Transporte',
    tipo: 'despesa',
    cor: '#3b82f6',
    icone: '🚗',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    user_id: DEFAULT_USER.id,
    nome: 'Moradia',
    tipo: 'despesa',
    cor: '#8b5cf6',
    icone: '🏠',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    user_id: DEFAULT_USER.id,
    nome: 'Lazer',
    tipo: 'despesa',
    cor: '#ec4899',
    icone: '🎮',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    user_id: DEFAULT_USER.id,
    nome: 'Salário',
    tipo: 'receita',
    cor: '#10b981',
    icone: '💰',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-6',
    user_id: DEFAULT_USER.id,
    nome: 'Freelance',
    tipo: 'receita',
    cor: '#14b8a6',
    icone: '💻',
    created_at: new Date().toISOString(),
  },
];

// Transações de exemplo (vazio - usuário adiciona manualmente)
export const generateSampleTransactions = (): Transaction[] => {
  return [];
};

// Funções de gerenciamento do localStorage
export const localDB = {
  // Inicializar dados
  init: () => {
    if (typeof window === 'undefined') return;
    
    if (!localStorage.getItem(KEYS.USER)) {
      localStorage.setItem(KEYS.USER, JSON.stringify(DEFAULT_USER));
    }
    
    if (!localStorage.getItem(KEYS.CATEGORIES)) {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    }
    
    // Sempre resetar transações para vazio para entrada manual
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([]));
    
    if (!localStorage.getItem(KEYS.INSIGHTS)) {
      localStorage.setItem(KEYS.INSIGHTS, JSON.stringify([]));
    }
  },
  
  // User
  getUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  
  setUser: (user: User | null) => {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  },
  
  // Categories
  getCategories: (): Category[] => {
    if (typeof window === 'undefined') return [];
    const categories = localStorage.getItem(KEYS.CATEGORIES);
    return categories ? JSON.parse(categories) : [];
  },
  
  setCategories: (categories: Category[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  },
  
  // Transactions
  getTransactions: (): Transaction[] => {
    if (typeof window === 'undefined') return [];
    const transactions = localStorage.getItem(KEYS.TRANSACTIONS);
    return transactions ? JSON.parse(transactions) : [];
  },
  
  setTransactions: (transactions: Transaction[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },
  
  // Insights
  getInsights: (): Insight[] => {
    if (typeof window === 'undefined') return [];
    const insights = localStorage.getItem(KEYS.INSIGHTS);
    return insights ? JSON.parse(insights) : [];
  },
  
  setInsights: (insights: Insight[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEYS.INSIGHTS, JSON.stringify(insights));
  },
  
  // Limpar tudo
  clear: () => {
    if (typeof window === 'undefined') return;
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },
};
