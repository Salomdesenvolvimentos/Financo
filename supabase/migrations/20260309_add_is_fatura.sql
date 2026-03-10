-- ============================================================
-- Migração: Adicionar campos is_fatura e modalidade_pagamento
-- Data: 2026-03-09
-- ============================================================

-- is_fatura: marcar pagamento de fatura de cartão (evita dupla contagem)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_fatura BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN transactions.is_fatura IS
  'Indica que esta transação é um pagamento de fatura de cartão de crédito. '
  'Quando TRUE, ela é excluída do total de despesas para evitar dupla contagem.';

-- modalidade_pagamento: à vista ou crédito
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS modalidade_pagamento VARCHAR(10) CHECK (modalidade_pagamento IN ('a_vista', 'credito'));

COMMENT ON COLUMN transactions.modalidade_pagamento IS
  'Modalidade da compra: a_vista (débito/dinheiro) ou credito (cartão de crédito).';

-- Índice para acelerar filtros de analytics
CREATE INDEX IF NOT EXISTS idx_transactions_is_fatura
  ON transactions (user_id, is_fatura, tipo, data_transacao);
