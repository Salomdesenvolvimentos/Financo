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
  plan?: 'free' | 'premium';
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
  /**
   * Indica que esta transação é um pagamento de fatura de cartão de crédito.
   * Quando true, ela NÃO é somada ao total de despesas para evitar dupla
   * contagem (as transações individuais do cartão já estão contabilizadas).
   */
  is_fatura?: boolean;
  /** Modalidade: compra à vista ou parcelada no crédito */
  modalidade_pagamento?: 'a_vista' | 'credito';
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
  /** Pagamento de fatura de cartão — exclui do total de despesas */
  is_fatura?: boolean;
  /** Modalidade: à vista ou crédito */
  modalidade_pagamento?: 'a_vista' | 'credito';
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
  forma_pagamento?: string;
  mes?: string; // Formato: "YYYY-MM"
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
// Tipos: Sistema Social (Amigos, Conquistas, Desafios em Dupla)
// ============================================

export interface Profile {
  id: string;
  display_name: string;
  avatar_emoji: string;
  bio?: string;
  total_points: number;
  email?: string;
  created_at: string;
  updated_at: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  // Dados do amigo (join)
  requester?: Profile;
  addressee?: Profile;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  points: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  // Joins
  achievement_definitions?: AchievementDefinition;
  profiles?: Profile;
}

export type DuoChallengeStatus = 'pending' | 'accepted' | 'declined' | 'active' | 'completed';
export type DuoType = 'cooperative' | 'challenge';

export interface DuoChallenge {
  id: string;
  challenge_id: string;
  title: string;
  description?: string;
  emoji: string;
  target: number;
  category: string;
  duo_type: DuoType;
  requester_id: string;
  addressee_id: string;
  requester_progress: number;
  addressee_progress: number;
  requester_completed: boolean;
  addressee_completed: boolean;
  status: DuoChallengeStatus;
  created_at: string;
  updated_at: string;
  // Joins
  requester?: Profile;
  addressee?: Profile;
}

// ============================================
// Tipos: Lista de Desejos / Metas Financeiras
// ============================================

export interface WishlistGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  category: string;
  completed: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface WishlistGoalFormData {
  title: string;
  description?: string;
  emoji: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
  category: string;
  priority?: number;
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

// ============================================
// Tipos para Gastos e Rendas Fixas
// ============================================

export interface FixedExpense {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  dia_vencimento: number; // 1-31
  categoria_id: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Dados relacionados (joins)
  categoria?: Category;
}

export interface FixedIncome {
  id: string;
  user_id: string;
  descricao: string;
  valor: number;
  dia_recebimento: number; // 1-31
  tipo: 'salario' | 'adiantamento' | 'outro';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedExpenseFormData {
  descricao: string;
  valor: number;
  dia_vencimento: number;
  categoria_id: string;
  ativo: boolean;
}

export interface FixedIncomeFormData {
  descricao: string;
  valor: number;
  dia_recebimento: number;
  tipo: 'salario' | 'adiantamento' | 'outro';
  ativo: boolean;
}

// ============================================
// Tipos para Previsão Financeira
// ============================================

export interface MonthlyForecast {
  mes: string; // "2025-02"
  ano: number;
  mes_nome: string;
  
  // Valores reais (transações já ocorridas)
  receitas_realizadas: number;
  despesas_realizadas: number;
  saldo_real: number;
  
  // Valores previstos (gastos/rendas fixas)
  receitas_previstas: number;
  despesas_previstas: number;
  
  // Projeção final
  saldo_previsto_final: number;
  
  // Metadados
  dias_restantes: number;
  dia_atual: number;
  status: 'positivo' | 'alerta' | 'critico';
  
  // Detalhes para análise
  detalhes_receitas: {
    fixas: FixedIncome[];
    variaveis: number;
  };
  detalhes_despesas: {
    fixas: FixedExpense[];
    variaveis: number;
  };
}

export interface ForecastAlert {
  tipo: 'vencimento_proximo' | 'saldo_insuficiente' | 'receita_pendente' | 'economia_baixa';
  mensagem: string;
  nivel: 'info' | 'alerta' | 'critico';
  dias?: number;
  valor?: number;
  item_id?: string;
  item_descricao?: string;
}

export interface CalendarEvent {
  id: string;
  tipo: 'receita_fixa' | 'despesa_fixa' | 'receita_realizada' | 'despesa_realizada';
  descricao: string;
  valor: number;
  dia: number;
  status: 'pendente' | 'realizado' | 'vencido';
  categoria?: string;
  cor?: string;
}

// ============================================
// Tipos para Investimentos
// ============================================

export type InvestmentType = 'cdb' | 'acoes' | 'fii' | 'tesouro_direto' | 'crypto' | 'poupanca' | 'lci_lca' | 'outro';

export interface Investment {
  id: string;
  user_id: string;
  nome: string;
  tipo: InvestmentType;
  instituicao: string;
  valor_investido: number;
  valor_atual: number;
  data_inicio: string;
  vencimento?: string;
  rentabilidade_anual?: number;
  notas?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestmentFormData {
  nome: string;
  tipo: InvestmentType;
  instituicao: string;
  valor_investido: number;
  valor_atual: number;
  data_inicio: string;
  vencimento?: string;
  rentabilidade_anual?: number;
  notas?: string;
  ativo: boolean;
}

// ============================================
// Tipos para Planos e Assinaturas
// ============================================

export type Plan = 'free' | 'premium';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  plan: Plan;
  current_period_start?: string;
  current_period_end?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
}
