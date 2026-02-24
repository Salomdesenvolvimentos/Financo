// ============================================
// FINACO - Constantes da Aplicação
// Valores fixos usados em todo o sistema
// ============================================

/**
 * Status possíveis de uma transação
 */
export const TRANSACTION_STATUS = {
  PAGO: 'pago',
  VENCIDO: 'vencido',
  ANDAMENTO: 'andamento',
} as const;

/**
 * Tipos de transação
 */
export const TRANSACTION_TYPES = {
  RECEITA: 'receita',
  DESPESA: 'despesa',
} as const;

/**
 * Níveis de insight
 */
export const INSIGHT_LEVELS = {
  INFO: 'info',
  ALERTA: 'alerta',
  RISCO: 'risco',
} as const;

/**
 * Cores padrão para categorias
 */
export const CATEGORY_COLORS = [
  '#EF4444', // vermelho
  '#F59E0B', // laranja
  '#10B981', // verde
  '#3B82F6', // azul
  '#8B5CF6', // roxo
  '#EC4899', // rosa
  '#6366F1', // índigo
  '#14B8A6', // teal
  '#F97316', // laranja escuro
  '#84CC16', // lime
] as const;

/**
 * Formas de pagamento sugeridas
 */
export const PAYMENT_METHODS = [
  'Dinheiro',
  'Cartão de Crédito',
  'Cartão de Débito',
  'PIX',
  'Boleto',
  'Transferência',
  'Cheque',
] as const;

/**
 * Limites do sistema
 */
export const LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TRANSACTIONS_PER_PAGE: 50,
  MAX_CATEGORIES: 50,
  MIN_PASSWORD_LENGTH: 6,
} as const;

/**
 * Mensagens padrão
 */
export const MESSAGES = {
  SUCCESS: {
    TRANSACTION_CREATED: 'Transação criada com sucesso!',
    TRANSACTION_UPDATED: 'Transação atualizada com sucesso!',
    TRANSACTION_DELETED: 'Transação excluída com sucesso!',
    CATEGORY_CREATED: 'Categoria criada com sucesso!',
    CATEGORY_UPDATED: 'Categoria atualizada com sucesso!',
    CATEGORY_DELETED: 'Categoria excluída com sucesso!',
    LOGIN_SUCCESS: 'Login realizado com sucesso!',
    SIGNUP_SUCCESS: 'Conta criada com sucesso!',
  },
  ERROR: {
    GENERIC: 'Ocorreu um erro. Tente novamente.',
    AUTH_FAILED: 'Email ou senha incorretos.',
    NETWORK: 'Erro de conexão. Verifique sua internet.',
    REQUIRED_FIELDS: 'Preencha todos os campos obrigatórios.',
    INVALID_EMAIL: 'Email inválido.',
    WEAK_PASSWORD: 'A senha deve ter no mínimo 6 caracteres.',
    PASSWORDS_DONT_MATCH: 'As senhas não coincidem.',
  },
} as const;

/**
 * Configurações de formatação
 */
export const FORMAT_CONFIG = {
  DATE: {
    locale: 'pt-BR',
    format: 'dd/MM/yyyy',
  },
  CURRENCY: {
    locale: 'pt-BR',
    currency: 'BRL',
  },
} as const;
