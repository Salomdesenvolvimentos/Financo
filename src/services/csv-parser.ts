// ============================================
// FINANCO - Parser Inteligente de CSV
// Detecta banco pelo cabeçalho, normaliza colunas,
// converte datas e valores automaticamente.
// ============================================

export interface CsvRow {
  data: string;              // ISO YYYY-MM-DD
  descricao: string;
  valor: number;             // sempre positivo
  tipo: 'receita' | 'despesa';
  forma_pagamento?: string;  // banco detectado
}

// ── Alias de colunas (normalizado, sem acento, minúsculo) ────────────────────

const DATE_COLS = [
  'data', 'date', 'data lancamento', 'data do lancamento',
  'data compra', 'data pagamento', 'data transacao', 'data caixa',
  'datacaixa', 'dt. lancamento', 'dt.lancamento', 'dt lancamento',
  'data mov', 'data mov.', 'data operacao', 'vencimento',
];

const DESC_COLS = [
  'descricao', 'historico', 'titulo', 'title', 'description',
  'historic', 'memo', 'lancamento', 'estabelecimento', 'detalhe',
  'complemento', 'loja', 'beneficiario', 'nome',
];

const AMOUNT_COLS = [
  'valor', 'amount', 'value', 'montante', 'valor cobrado',
  'vl lancamento', 'vl. lancamento', 'vl.lancamento', 'importancia',
];

const TYPE_COLS = [
  'tipo', 'type', 'natureza', 'movimentacao', 'operacao',
];

const CREDIT_COLS = [
  'credito', 'credit', 'entrada', 'receita', 'creditos',
];

const DEBIT_COLS = [
  'debito', 'debit', 'saida', 'despesa', 'debitos',
];

// ── Helpers de normalização ───────────────────────────────────────────────────

/** Remove acentos, lowercase, trim */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Encontra o índice de uma coluna pelos aliases */
function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (aliases.includes(headers[i])) return i;
  }
  return -1;
}

// ── Parsing de data ──────────────────────────────────────────────────────────

/** Converte qualquer formato de data para ISO YYYY-MM-DD sem usar new Date(string) */
export function parseDate(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().replace(/^["']|["']$/g, '');

  // Já ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY | DD-MM-YYYY | DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD/MM/YY (ano com 2 dígitos)
  const dmyShort = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmyShort) {
    const [, d, m, y] = dmyShort;
    const year = parseInt(y) < 70 ? `20${y}` : `19${y}`;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY/MM/DD ou YYYY.MM.DD
  const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return s; // retorna como está se não reconhecido
}

// ── Parsing de valor ──────────────────────────────────────────────────────────

interface ParsedAmount {
  value: number;
  tipo: 'receita' | 'despesa';
}

export function parseAmount(raw: string | number): ParsedAmount {
  if (typeof raw === 'number') {
    return { value: Math.abs(raw), tipo: raw < 0 ? 'despesa' : 'receita' };
  }

  let s = String(raw).trim().replace(/^["']|["']$/g, '').replace(/R\$\s*/gi, '');

  let tipo: 'receita' | 'despesa' = 'despesa';

  // Sufixo C (crédito) / D (débito) — formato de alguns bancos
  if (/\bC$/i.test(s)) { tipo = 'receita'; s = s.replace(/\s*C$/i, ''); }
  else if (/\bD$/i.test(s)) { tipo = 'despesa'; s = s.replace(/\s*D$/i, ''); }

  // Sinal explícito
  const isNeg = s.startsWith('-') || s.startsWith('(');
  const isPos = s.startsWith('+');
  if (isNeg) tipo = 'despesa';
  if (isPos) tipo = 'receita';

  // Remover parênteses (formato contábil negativo)
  s = s.replace(/[()]/g, '').replace(/^[+\-]/, '').trim();

  // Detectar separador decimal
  // Formato BR: 1.234,56 → ponto = milhar, vírgula = decimal
  // Formato US: 1,234.56 → vírgula = milhar, ponto = decimal
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  let value: number;

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastComma > lastDot) {
      // BR: 1.234,56
      value = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    } else {
      // US: 1,234.56
      value = parseFloat(s.replace(/,/g, ''));
    }
  } else if (hasComma && !hasDot) {
    // Vírgula como decimal (BR sem milhar): 234,56
    value = parseFloat(s.replace(',', '.'));
  } else {
    value = parseFloat(s);
  }

  return { value: isNaN(value) ? 0 : Math.abs(value), tipo };
}

// ── Detecção de banco ─────────────────────────────────────────────────────────

function detectBank(headers: string[]): string {
  const h = new Set(headers);
  if (h.has('categoria') && (h.has('titulo') || h.has('title'))) return 'Nubank';
  if (h.has('identificador')) return 'Nubank Conta';
  if (h.has('credito') && h.has('debito') && h.has('saldo')) return 'Banco do Brasil';
  if (h.has('data lancamento') && (h.has('valor cobrado') || h.has('vl lancamento'))) return 'Caixa';
  if (h.has('numorigem') || h.has('datacaixa')) return 'Bradesco';
  if (h.has('historico') && h.has('credito') && !h.has('debito')) return 'Inter';
  if (h.has('historico') || h.has('lancamento')) return 'Itaú/Santander';
  return 'Extrato';
}

// ── Separador de linha CSV (respeita aspas) ───────────────────────────────────

function splitLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === sep && !inQuotes) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

// ── Parser principal ──────────────────────────────────────────────────────────

/**
 * Analisa um CSV de extrato bancário e retorna transações normalizadas.
 * Detecta automaticamente: banco, separador, colunas, formato de data e valor.
 * Retorna [] se não for possível detectar colunas essenciais (fallback ao parser legado).
 */
export function parseCSVSmart(text: string): CsvRow[] {
  // Normalizar quebras de linha e remover BOM
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // ── Detectar separador ────────────────────────────────────────────────────
  const firstLine = lines[0];
  const sepCounts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (const ch of firstLine) { if (ch in sepCounts) sepCounts[ch]++; }
  const sep = (['\t', '|', ';', ','] as const).reduce<string>(
    (best, c) => sepCounts[c] > sepCounts[best] ? c : best,
    ','
  );

  // ── Parsear cabeçalho ─────────────────────────────────────────────────────
  const rawHeaders = splitLine(firstLine, sep);
  const normHeaders = rawHeaders.map(h => norm(h));

  const bank = detectBank(normHeaders);

  // ── Mapear colunas ────────────────────────────────────────────────────────
  let dateIdx = findCol(normHeaders, DATE_COLS);
  let descIdx = findCol(normHeaders, DESC_COLS);
  let amountIdx = findCol(normHeaders, AMOUNT_COLS);
  const typeIdx = findCol(normHeaders, TYPE_COLS);
  const creditIdx = findCol(normHeaders, CREDIT_COLS);
  const debitIdx = findCol(normHeaders, DEBIT_COLS);

  // Banco do Brasil: não tem coluna 'valor', usa crédito/débito separados
  const isBBFormat = amountIdx === -1 && creditIdx !== -1 && debitIdx !== -1;

  if (dateIdx === -1 || descIdx === -1 || (!isBBFormat && amountIdx === -1)) {
    // Não foi possível detectar colunas essenciais
    return [];
  }

  // ── Parsear linhas ────────────────────────────────────────────────────────
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], sep);

    const rawDate = cols[dateIdx] ?? '';
    const rawDesc = (cols[descIdx] ?? '').replace(/^["']|["']$/g, '').trim();
    if (!rawDate || !rawDesc) continue;

    const data = parseDate(rawDate);
    if (!data) continue;

    let valor = 0;
    let tipo: 'receita' | 'despesa' = 'despesa';

    if (isBBFormat) {
      // BB: colunas separadas para crédito e débito
      const credit = parseAmount(cols[creditIdx] ?? '');
      const debit = parseAmount(cols[debitIdx] ?? '');
      if (credit.value > 0) { valor = credit.value; tipo = 'receita'; }
      else if (debit.value > 0) { valor = debit.value; tipo = 'despesa'; }
      else continue;
    } else {
      const parsed = parseAmount(cols[amountIdx] ?? '');
      valor = parsed.value;
      tipo = parsed.tipo;
    }

    if (valor === 0) continue;

    // Sobrescrever tipo a partir de coluna dedicada (ex: Nubank conta)
    if (typeIdx !== -1) {
      const t = norm(cols[typeIdx] ?? '');
      if (['credito', 'credit', 'c', 'receita', 'entrada'].includes(t)) tipo = 'receita';
      else if (['debito', 'debit', 'd', 'despesa', 'saida'].includes(t)) tipo = 'despesa';
    }

    rows.push({ data, descricao: rawDesc.substring(0, 100), valor, tipo, forma_pagamento: bank });
  }

  return rows;
}
