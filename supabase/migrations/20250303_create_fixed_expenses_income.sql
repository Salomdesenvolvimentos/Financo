-- ============================================
-- FINACO - Migração: Gastos e Rendas Fixas
-- Criar tabelas para gerenciar gastos e rendas fixas mensais
-- ============================================

-- Tabela de Gastos Fixos
CREATE TABLE IF NOT EXISTS fixed_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
    categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de Rendas Fixas
CREATE TABLE IF NOT EXISTS fixed_income (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
    dia_recebimento INTEGER NOT NULL CHECK (dia_recebimento >= 1 AND dia_recebimento <= 31),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('salario', 'adiantamento', 'outro')),
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_ativo ON fixed_expenses(ativo);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_dia_vencimento ON fixed_expenses(dia_vencimento);

CREATE INDEX IF NOT EXISTS idx_fixed_income_user_id ON fixed_income(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_income_ativo ON fixed_income(ativo);
CREATE INDEX IF NOT EXISTS idx_fixed_income_dia_recebimento ON fixed_income(dia_recebimento);

-- RLS (Row Level Security)
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_income ENABLE ROW LEVEL SECURITY;

-- Policies para fixed_expenses
CREATE POLICY "Users can view their own fixed expenses" ON fixed_expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed expenses" ON fixed_expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed expenses" ON fixed_expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed expenses" ON fixed_expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Policies para fixed_income
CREATE POLICY "Users can view their own fixed income" ON fixed_income
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed income" ON fixed_income
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed income" ON fixed_income
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed income" ON fixed_income
    FOR DELETE USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fixed_expenses_updated_at BEFORE UPDATE ON fixed_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_income_updated_at BEFORE UPDATE ON fixed_income
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE fixed_expenses IS 'Gastos fixos mensais do usuário (contas, aluguel, etc)';
COMMENT ON COLUMN fixed_expenses.dia_vencimento IS 'Dia do mês em que a conta vence (1-31)';
COMMENT ON COLUMN fixed_expenses.ativo IS 'Indica se o gasto fixo está ativo ou pausado';

COMMENT ON TABLE fixed_income IS 'Rendas fixas mensais do usuário (salário, adiantamento, etc)';
COMMENT ON COLUMN fixed_income.dia_recebimento IS 'Dia do mês em que a renda é recebida (1-31)';
COMMENT ON COLUMN fixed_income.tipo IS 'Tipo da renda: salário, adiantamento ou outro';
COMMENT ON COLUMN fixed_income.ativo IS 'Indica se a renda fixa está ativa ou pausada';
