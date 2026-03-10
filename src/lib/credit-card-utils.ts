// ============================================
// FINACO - Utilitários de Detecção de Fatura de Cartão
// Lógica para identificar pagamentos de fatura e evitar
// dupla contagem de despesas
// ============================================

export interface TransactionLike {
  id: string;
  valor: number;
  data_transacao: string;
  forma_pagamento?: string | null;
  tipo: 'receita' | 'despesa';
  is_fatura?: boolean;
}

/**
 * Nomes de cartões de crédito conhecidos (substrings, case-insensitive).
 * Usados para identificar transações feitas no cartão e cruzar com a fatura.
 */
export const CREDIT_CARD_NAMES = [
  'nubank',
  'santander',
  'bradesco',
  'itaú',
  'itau',
  'banco do brasil',
  'bb crédito',
  'caixa',
  'inter',
  'c6',
  'xp',
  'next',
  'neon',
  'original',
  'porto seguro',
  'sicoob',
  'sicredi',
  'banrisul',
  'safra',
  'modal',
  'will bank',
  'pagbank',
] as const;

/**
 * Palavras-chave que indicam que a transação é um pagamento de fatura.
 * Qualquer uma delas na descrição (case-insensitive) identifica a transação.
 */
export const FATURA_KEYWORDS = [
  'fatura',
  'pgto fatura',
  'pgto. fatura',
  'pagamento fatura',
  'pag. fatura',
  'pag fatura',
  'pagto fatura',
  'faturas',
  'bill payment',
  'cartão fatura',
  'pagamento cartão',
  'pag cartão',
];

/**
 * Verifica se a descrição/forma_pagamento de uma transação indica que ela
 * é um pagamento de fatura de cartão de crédito.
 *
 * Critérios:
 *  - tipo deve ser 'despesa'
 *  - descrição contém alguma palavra-chave de fatura OU
 *  - descrição contém nome de cartão + algum indicador de pagamento
 */
export function isFaturaByDescription(
  descricao: string,
  tipo: 'receita' | 'despesa'
): boolean {
  if (tipo !== 'despesa') return false;
  const lower = descricao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return FATURA_KEYWORDS.some((kw) => {
    const kwNorm = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return lower.includes(kwNorm);
  });
}

/**
 * Extrai o nome do cartão da descrição de uma transação.
 * Retorna null se nenhum cartão conhecido for encontrado.
 */
export function extractCardName(text: string): string | null {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return (
    CREDIT_CARD_NAMES.find((name) => {
      const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return lower.includes(norm);
    }) ?? null
  );
}

/**
 * Soma das despesas no cartão `cardName` dentro de uma janela de 60 dias
 * antes da data da fatura, excluindo outras faturas.
 */
function sumCardTransactions(
  cardName: string,
  faturaDate: Date,
  allTransactions: TransactionLike[]
): number {
  const windowStart = new Date(faturaDate);
  windowStart.setDate(windowStart.getDate() - 60);

  return allTransactions
    .filter((t) => {
      if (t.tipo !== 'despesa' || t.is_fatura) return false;
      if (!t.forma_pagamento) return false;
      const tDate = new Date(t.data_transacao);
      if (tDate < windowStart || tDate >= faturaDate) return false;
      const cardNorm = cardName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const fpNorm = t.forma_pagamento
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return fpNorm.includes(cardNorm);
    })
    .reduce((sum, t) => sum + Number(t.valor), 0);
}

export interface FaturaMatchResult {
  /** O sistema detectou que é uma provável fatura */
  isProbableFatura: boolean;
  /** Nome do cartão detectado na descrição (pode ser null) */
  detectedCard: string | null;
  /** Soma das transações do cartão no período */
  matchedTotal: number;
  /** True se o valor da fatura bate (~5% de tolerância) com a soma do cartão */
  amountMatches: boolean;
  /** Confiança: 'alta' | 'media' | 'baixa' */
  confidence: 'alta' | 'media' | 'baixa';
}

/**
 * Análise completa: verifica se uma transação é fatura buscando
 * keywords E cruzando o valor com as despesas no cartão no período.
 *
 * @param transaction  A transação sendo analisada
 * @param allTransactions  Todas as transações (para cálculo de soma do cartão)
 */
export function analyzeFaturaMatch(
  transaction: TransactionLike & { descricao: string },
  allTransactions: TransactionLike[]
): FaturaMatchResult {
  const keywordMatch = isFaturaByDescription(transaction.descricao, transaction.tipo);
  const detectedCard = extractCardName(transaction.descricao);

  if (!keywordMatch) {
    return {
      isProbableFatura: false,
      detectedCard: null,
      matchedTotal: 0,
      amountMatches: false,
      confidence: 'baixa',
    };
  }

  // Se tem keyword mas não identificamos o cartão, ainda é provável fatura
  if (!detectedCard) {
    return {
      isProbableFatura: true,
      detectedCard: null,
      matchedTotal: 0,
      amountMatches: false,
      confidence: 'media',
    };
  }

  const faturaDate = new Date(transaction.data_transacao);
  const matchedTotal = sumCardTransactions(detectedCard, faturaDate, allTransactions);

  const tolerance = Number(transaction.valor) * 0.05; // 5% de tolerância
  const diff = Math.abs(matchedTotal - Number(transaction.valor));
  const amountMatches = matchedTotal > 0 && diff <= tolerance;

  return {
    isProbableFatura: true,
    detectedCard,
    matchedTotal,
    amountMatches,
    confidence: amountMatches ? 'alta' : 'media',
  };
}

/**
 * Retorna true se a transação deve ser excluída dos totais de despesa.
 * Uma transação marcada como fatura (is_fatura === true) não deve
 * ser somada ao total de despesas, pois as transações individuais
 * do cartão já estão contabilizadas.
 */
export function shouldExcludeFromExpenses(transaction: TransactionLike): boolean {
  return transaction.tipo === 'despesa' && transaction.is_fatura === true;
}
