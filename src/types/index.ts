// ============================================
// FINACO - Tipos TypeScript
// Definições de tipos para todo o sistema
// ============================================

// ============================================
// Tipos de Dados do Banco
// ============================================

export interface User {
  id: string;
  email: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor?: string;
  icone?: string;
  created_at: string;
}

export type TransactionStatus = 'pago' | 'vencido' | 'andamento';
export type TransactionType = 'receita' | 'despesa';

export interface Transaction {
  id: string;
  user_id: string;
  numero: number;
  descricao: string;
  tipo: TransactionType;
  categoria_id?: string;
  responsavel?: string;
  status: TransactionStatus;
  valor: number;
  data_transacao: string;
  data_vencimento?: string;
  forma_pagamento?: string;
  parcelado: boolean;
  total_parcelas: number;
  parcela_atual: number;
  grupo_parcela_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Dados relacionados (joins)
  categoria?: Category;
}

export type InsightLevel = 'info' | 'alerta' | 'risco';

export interface Insight {
  id: string;
  user_id: string;
  mensagem: string;
  nivel: InsightLevel;
  tipo?: string;
  valor_referencia?: number;
  created_at: string;
}

export interface LearningRule {
  id: string;
  user_id: string;
  descricao_pattern: string;
  categoria_id: string;
  tipo: TransactionType;
  confianca: number;
  created_at: string;
}

// ============================================
// Tipos para Forms e DTOs
// ============================================

export interface TransactionFormData {
  descricao: string;
  tipo: TransactionType;
  categoria_id?: string;
  responsavel?: string;
  status: TransactionStatus;
  valor: number;
  data_transacao: string;
  data_vencimento?: string;
  forma_pagamento?: string;
  parcelado: boolean;
  total_parcelas?: number;
  observacoes?: string;
}

export interface CategoryFormData {
  nome: string;
  tipo: TransactionType;
  cor?: string;
  icone?: string;
}

// ============================================
// Tipos para Dashboard e Análises
// ============================================

export interface FinancialSummary {
  receita_total: number;
  despesa_total: number;
  saldo: number;
  economia_percentual: number;
  contas_vencidas: number;
  contas_pendentes: number;
}

export interface MonthlyComparison {
  mes_atual: {
    receita: number;
    despesa: number;
    saldo: number;
  };
  mes_anterior: {
    receita: number;
    despesa: number;
    saldo: number;
  };
  variacao: {
    receita_percentual: number;
    despesa_percentual: number;
    saldo_percentual: number;
  };
}

export interface CategorySummary {
  categoria_id: string;
  categoria_nome: string;
  categoria_cor: string;
  total: number;
  percentual: number;
  quantidade: number;
}

export interface DailyExpense {
  dia: string;
  total: number;
  quantidade: number;
}

export interface WeekdayExpense {
  dia_semana: string;
  dia_numero: number;
  total: number;
  media: number;
}

export interface HourlyExpense {
  hora: number;
  total: number;
  quantidade: number;
}

export interface MonthlyTrend {
  mes: string;
  ano: number;
  receita: number;
  despesa: number;
  saldo: number;
}

export interface FinancialScore {
  score: number; // 0-100
  nivel: 'excelente' | 'bom' | 'atencao' | 'risco';
  mensagem: string;
  fatores: {
    saldo_positivo: boolean;
    economia_adequada: boolean;
    sem_vencidos: boolean;
    tendencia_positiva: boolean;
  };
}

// ============================================
// Tipos para Importação
// ============================================

export interface ImportedTransaction {
  descricao: string;
  valor: number;
  data: string;
  tipo_sugerido: TransactionType;
  categoria_sugerida?: string;
  confianca: number;
}

export interface ImportResult {
  sucesso: number;
  falhas: number;
  transacoes: ImportedTransaction[];
  erros?: string[];
}

// ============================================
// Tipos para Filtros
// ============================================

export interface TransactionFilters {
  tipo?: TransactionType;
  status?: TransactionStatus;
  categoria_id?: string;
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
  responsavel?: string;
}

export interface DateRange {
  inicio: Date;
  fim: Date;
}

// ============================================
// Tipos para UI
// ============================================

export interface SelectOption {
  label: string;
  value: string;
}

export interface ToastMessage {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

// ============================================
// Tipos para Estado Global (Zustand)
// ============================================

export interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  
  filters: TransactionFilters;
  setFilters: (filters: TransactionFilters) => void;
  
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}
