// ============================================
// FINACO - Parser de PDF de Extratos Bancários
// Processamento inteligente de PDFs do Nubank e outros bancos
// ============================================

'use client';

interface ParsedTransaction {
  data: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  // opcionalmente preenchido pelo parser para indicar a origem/cartão
  forma_pagamento?: string;
}

// Declaração de tipo para o PDF.js carregado via CDN
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

/**
 * Carrega a biblioteca PDF.js via CDN
 */
async function loadPDFJS() {
  if (typeof window === 'undefined') return null;
  
  // Se já está carregado, retorna
  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }
  
  // Carregar PDF.js via CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js não carregou corretamente'));
      }
    };
    script.onerror = () => reject(new Error('Falha ao carregar PDF.js'));
    document.head.appendChild(script);
  });
}

/**
 * Processa PDF do Nubank e extrai transações
 */
export async function parsePDF(file: File): Promise<ParsedTransaction[]> {
  try {
    // Converter PDF para texto usando biblioteca cliente-side
    const text = await extractTextFromPDF(file);
    
    console.log('📄 Texto extraído do PDF (primeiros 2000 chars):', text.substring(0, 2000));
    console.log('📄 Total de caracteres:', text.length);
    
    // Identificar banco e aplicar parser específico
    // converter tudo para lowercase para comparações
    const lower = text.toLowerCase();
    const snippet = lower.slice(0, 800); // primeiras linhas do PDF

    // detectar Nubank primeiro, padrão mais restrito
    if (lower.includes('nu pagamentos') || lower.includes('nubank') || lower.includes('movimentaç')) {
      const transactions = parseNubankPDF(text);
      console.log('✅ Transações extraídas do Nubank:', transactions.length);
      console.log('📊 Primeiras 5 transações:', transactions.slice(0, 5));
      return transactions;
    }

    // depois Santander: verificar presença de 'internet banking' ou header típico
    if ((snippet.includes('internet banking') && snippet.includes('santander')) || snippet.includes('extrato de conta corrente')) {
      const transactions = parseSantanderPDF(text);
      console.log('✅ Transações extraídas do Santander:', transactions.length);
      console.log('📊 Primeiras 5 transações:', transactions.slice(0, 5));
      return transactions;
    }
    
    // Fallback: tentar parser genérico
    return parseGenericPDF(text);
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    throw new Error('Não foi possível processar o PDF. Verifique se o arquivo está correto.');
  }
}

/**
 * Extrai texto do PDF no navegador
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    // Carregar PDF.js via CDN
    const pdfjsLib = await loadPDFJS();
    if (!pdfjsLib) {
      throw new Error('PDF.js não está disponível');
    }
    
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    // Extrair texto de todas as páginas preservando quebras de linha
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY = -1;
      const pageLines: string[] = [];
      let currentLine = '';
      
      textContent.items.forEach((item: any) => {
        const currentY = item.transform[5];
        const text = item.str;
        
        // Se mudou de linha (Y diferente com margem de 2px), adiciona linha atual e começa nova
        if (lastY !== -1 && Math.abs(currentY - lastY) > 2) {
          if (currentLine.trim()) {
            pageLines.push(currentLine.trim());
          }
          currentLine = text;
        } else {
          // Mesma linha, adiciona espaço se necessário
          if (currentLine && !currentLine.endsWith(' ') && !text.startsWith(' ')) {
            currentLine += ' ';
          }
          currentLine += text;
        }
        
        lastY = currentY;
      });
      
      // Adicionar última linha
      if (currentLine.trim()) {
        pageLines.push(currentLine.trim());
      }
      
      fullText += pageLines.join('\n') + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Erro ao extrair texto do PDF:', error);
    throw new Error('Falha ao processar PDF');
  }
}

/**
 * Parser específico para PDFs do Nubank
 */
function parseNubankPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Mapear meses
  const monthMap: Record<string, number> = {
    JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
    JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11
  };
  
  // Dividir em linhas e limpar
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('📋 Total de linhas no PDF:', lines.length);
  
  let currentDate = '';
  let currentType: 'receita' | 'despesa' = 'despesa';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Detectar data no formato "DD MMM YYYY" ou "DD JAN 2026"
    const dateMatch = line.match(/(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i);
    if (dateMatch) {
      const [, day, monthStr, year] = dateMatch;
      const month = monthMap[monthStr.toUpperCase()];
      currentDate = `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('📅 Data detectada:');
      console.log('   Linha completa:', line);
      console.log('   Dia extraído:', day);
      console.log('   Mês extraído:', monthStr, '→ índice:', month);
      console.log('   Ano extraído:', year);
      console.log('   Data final (ISO):', currentDate);
      // NÃO fazer continue - a mesma linha pode ter "Total de entradas/saídas"
    }
    
    // Detectar tipo de seção
    if (lineLower.includes('total de entradas')) {
      currentType = 'receita';
      console.log('💰 Seção mudou para: RECEITAS');
      continue;
    }
    if (lineLower.includes('total de sa') || lineLower.includes('total de saídas')) {
      currentType = 'despesa';
      console.log('💸 Seção mudou para: DESPESAS');
      continue;
    }
    
    // Keywords que indicam transação no Nubank
    const transactionKeywords = [
      'transferência recebida',
      'transferência enviada',
      'transferência de saldo',
      'pagamento de boleto efetuado',
      'pagamento de boleto',
      'pagamento de fatura',
      'reembolso recebido',
      'reembolso',
      'compra',
      'débito',
      'crédito',
      'pix recebido',
      'pix enviado',
      'ted',
      'doc',
      'depósito'
    ];
    
    const isTransaction = transactionKeywords.some(keyword => lineLower.includes(keyword));
    
    if (isTransaction && currentDate) {
      console.log('🔍 Transação detectada:', line);
      console.log('   ↳ Tipo atual:', currentType, '| Data:', currentDate);
      
      // 1. PRIMEIRO: Verificar se o valor está NA MESMA LINHA (ex: "... 145,60" ou "... 1.243,29")
      const sameLineValueMatch = line.match(/([\d.]+,\d{2})$/);
      if (sameLineValueMatch) {
        const amountStr = sameLineValueMatch[1];
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        
        if (amount > 0 && amount <= 100000) {
          console.log('   💰 Valor encontrado NA MESMA LINHA:', amountStr, '→', amount);
          
          // Limpar descrição (remover o valor do final)
          let description = line
            .replace(sameLineValueMatch[0], '')
            .replace(/\s*\d{3}\.\d{3}\.\d{3}-\d{2}\s*/g, '')
            .replace(/\s*•{3}\.\d{3}\.\d{3}-•{2}\s*/g, '')
            .replace(/\s*\(?\d{4}\)?\s*Agência:?\s*\d+\s*/gi, '')
            .replace(/\s*Conta:?\s*\d+-?\d*\s*/gi, '')
            .replace(/\s*-\s*$/, '')
            .trim();
          
          if (description.length > 100) {
            description = description.substring(0, 100);
          }
          
          console.log('   📝 Transação completa:', {
            descricao: description,
            valor: amount,
            tipo: currentType,
            data: currentDate
          });
          
          transactions.push({
            data: currentDate,
            descricao: description,
            valor: amount,
            tipo: currentType,
            forma_pagamento: 'Nubank',
          });
          
          continue; // Pular busca nas próximas linhas
        }
      }
      
      // 2. SEGUNDO: Procurar valor nas próximas linhas - pegar o PRIMEIRO valor encontrado
      let foundValue = false;
      for (let j = i + 1; j < Math.min(i + 11, lines.length); j++) {
        const nextLine = lines[j];
        
        // Pular linhas que são datas ou seções
        if (nextLine.match(/\d{2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)/i) ||
            nextLine.toLowerCase().includes('total de')) {
          console.log('   ⏹️ Parou em:', nextLine);
          break;
        }
        
        // Procurar valor no formato XXX,XX ou X.XXX,XX (linha inteira deve ser só o valor)
        const valueMatch = nextLine.match(/^([\d.]+,\d{2})$/);
        if (valueMatch) {
          const amountStr = valueMatch[1];
          const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
          
          if (amount > 0 && amount <= 100000) {
            console.log('   💰 Valor encontrado em linha separada:', amountStr, '→', amount);
            
            // Limpar descrição
            let description = line
              .replace(/\s*\d{3}\.\d{3}\.\d{3}-\d{2}\s*/g, '')
              .replace(/\s*•{3}\.\d{3}\.\d{3}-•{2}\s*/g, '')
              .replace(/\s*\(?\d{4}\)?\s*Agência:?\s*\d+\s*/gi, '')
              .replace(/\s*Conta:?\s*\d+-?\d*\s*/gi, '')
              .replace(/\s*-\s*$/, '')
              .trim();
            
            if (description.length > 100) {
              description = description.substring(0, 100);
            }
            
            console.log('   📝 Transação completa:', {
              descricao: description,
              valor: amount,
              tipo: currentType,
              data: currentDate
            });
            
            transactions.push({
              data: currentDate,
              descricao: description,
              valor: amount,
              tipo: currentType,
              forma_pagamento: 'Nubank',
            });
            
            foundValue = true;
            break; // Parar no PRIMEIRO valor encontrado
          } else if (amount > 100000) {
            console.log('   ⚠️ Valor ignorado (muito grande):', amountStr);
          }
        }
      }
      
      if (!foundValue) {
        console.log('   ❌ Nenhum valor válido encontrado nas próximas 10 linhas');
      }
    }
  }
  
  console.log('🎯 Total de transações extraídas:', transactions.length);
  
  // Se não encontrou transações, tentar parser alternativo
  if (transactions.length === 0) {
    console.log('⚠️ Nenhuma transação encontrada, tentando parser alternativo...');
    return parseNubankAlternative(text);
  }
  
  return transactions;
}

/**
 * Parser alternativo para Nubank (formato diferente)
 */
function parseNubankAlternative(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  console.log('🔄 Usando parser alternativo...');
  
  // Mapear meses
  const monthMap: Record<string, number> = {
    JAN: 0, FEV: 1, MAR: 2, ABR: 3, MAI: 4, JUN: 5,
    JUL: 6, AGO: 7, SET: 8, OUT: 9, NOV: 10, DEZ: 11
  };
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  console.log('📋 Total de linhas após split:', lines.length);
  console.log('📋 Primeiras 50 linhas:');
  lines.slice(0, 50).forEach((line, idx) => {
    console.log(`  ${idx}: ${line}`);
  });
  
  let currentDate = '';
  let currentType: 'receita' | 'despesa' = 'despesa';
  let skipNextValue = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar data
    const dateMatch = line.match(/(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i);
    if (dateMatch) {
      const [, day, monthStr, year] = dateMatch;
      const month = monthMap[monthStr.toUpperCase()];
      currentDate = `${year}-${String(month + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('📅 Data encontrada:', currentDate);
      continue;
    }
    
    // Detectar tipo
    if (line.toLowerCase().includes('total de entradas')) {
      currentType = 'receita';
      skipNextValue = true;
      console.log('💰 Seção: RECEITAS');
      continue;
    }
    if (line.toLowerCase().includes('total de sa') || line.toLowerCase().includes('total de saídas')) {
      currentType = 'despesa';
      skipNextValue = true;
      console.log('💸 Seção: DESPESAS');
      continue;
    }
    
    // Pular valor do total
    if (skipNextValue && /^[\+\-]\s*[\d.,]+$/.test(line)) {
      console.log('⏭️ Pulando total:', line);
      skipNextValue = false;
      continue;
    }
    
    // Detectar linha de transação
    const transactionKeywords = [
      'transferência recebida pelo pix',
      'transferência recebida',
      'transferência enviada pelo pix', 
      'transferência enviada',
      'transferência de saldo',
      'pagamento de fatura',
      'pagamento de boleto efetuado',
      'pagamento de boleto',
      'reembolso recebido pelo pix',
      'reembolso recebido',
      'compra no débito',
      'compra no crédito'
    ];
    
    const lowerLine = line.toLowerCase();
    const matchedKeyword = transactionKeywords.find(keyword => lowerLine.startsWith(keyword));
    
    if (matchedKeyword && currentDate) {
      console.log('🔍 Transação detectada (linha', i, '):', line);
      
      let description = line;
      let amount = 0;
      
      // Buscar valor nas próximas linhas
      for (let j = i + 1; j <= Math.min(i + 8, lines.length - 1); j++) {
        const nextLine = lines[j].trim();
        console.log(`   🔎 Procurando valor na linha ${j}: "${nextLine}"`);
        
        // Verificar se é um valor monetário isolado
        const valueMatch = nextLine.match(/^([\d.]+,\d{2})$/);
        if (valueMatch) {
          amount = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
          console.log('   💵 ✅ Valor encontrado:', amount);
          break;
        }
        
        // Parar se encontrar próxima transação, data ou total
        if (transactionKeywords.some(kw => nextLine.toLowerCase().startsWith(kw))) {
          console.log('   ⏹️ Parou: próxima transação');
          break;
        }
        if (/\d{2}\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4}/.test(nextLine)) {
          console.log('   ⏹️ Parou: próxima data');
          break;
        }
        if (nextLine.toLowerCase().includes('total de')) {
          console.log('   ⏹️ Parou: linha de total');
          break;
        }
      }
      
      if (amount > 0) {
        let cleanDesc = description
          .replace(/\s*•{3}\.\d{3}\.\d{3}-•{2}\s*/g, '')
          .replace(/\s*\d{3}\.\d{3}\.\d{3}-\d{2}\s*/g, '')
          .replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\s*/g, '')
          .replace(/\s*-\s*\(\d{4}\)\s*Agência:?\s*\d+\s*Conta:?\s*[\d-]+\s*/gi, '')
          .replace(/\s*-\s*$/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        
        if (cleanDesc.length > 100) {
          cleanDesc = cleanDesc.substring(0, 100);
        }
        
        console.log('✅ Transação extraída:', {
          data: currentDate,
          descricao: cleanDesc,
          valor: amount,
          tipo: currentType
        });
        
        transactions.push({
          data: currentDate,
          descricao: cleanDesc,
          valor: amount,
          tipo: currentType,
          forma_pagamento: 'Nubank',
        });
      } else {
        console.log('⚠️ Valor não encontrado para:', description);
      }
    }
  }
  
  console.log('🎯 Total extraído:', transactions.length);
  return transactions;
}

/**
 * Parser genérico para outros bancos
 */

/**
 * Parser específico para extratos do Santander (formato comum de conta corrente)
 */
function parseSantanderPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  console.log('🪙 Iniciando parser Santander, linhas:', lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // o extrato geralmente começa com data no início da linha
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;

    let currentDate = '';
    try {
      const [d, m, y] = dateMatch[1].split('/');
      currentDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } catch (e) {
      continue;
    }

    // O Santander frequentemente coloca a descrição em uma linha
    // e os valores (débito/crédito/saldo) na linha seguinte.
    // Montamos um bloco com a linha atual + até 3 próximas linhas
    // e procuramos por valores nesse bloco.
    let block = line;
    let consumedLines = 0;
    for (let k = 1; k <= 3 && i + k < lines.length; k++) {
      // pare de anexar se a próxima linha começa com outra data (nova transação)
      if (/^\d{2}\/\d{2}\/\d{4}/.test(lines[i + k])) break;
      block += ' ' + lines[i + k];
      consumedLines = k;
    }

    // coletar todos os valores monetários no bloco
    const moneyMatches = block.match(/-?[\d\.]+,\d{2}/g) || [];
    if (moneyMatches.length === 0) continue; // nada pra extrair

    console.log(`     💰 Linha ${i}: encontrados ${moneyMatches.length} valores =>`, moneyMatches);

    // por convenção, o último valor é o saldo; o anterior é o valor da transação
    let amountStr: string;
    if (moneyMatches.length === 1) {
      amountStr = moneyMatches[0];
    } else {
      amountStr = moneyMatches[moneyMatches.length - 2];
    }

    console.log(`     🎯 Valor selecionado (índice ${moneyMatches.length - 2}): "${amountStr}"`);

    // determinar tipo baseado no sinal
    const isNegative = amountStr.includes('-');
    const tipo: 'receita' | 'despesa' = isNegative ? 'despesa' : 'receita';

    let amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
    // garantir valor positivo; tipo já indica se é despesa ou receita
    amount = Math.abs(amount);
    console.log(`     ✓ Tipo detectado: ${tipo}, Valor numérico: ${amount}`);
    if (isNaN(amount) || amount === 0) continue;

    // construir descrição: remover data + valores + possíveis doc/situação do bloco
    let description = block
      .replace(dateMatch[1], '')
      // remover todos os valores encontrados no bloco (inclui saldo)
      .replace(new RegExp(moneyMatches.map(m => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'), '')
      // tirar números isolados (docs, situação, agência/conta)
      .replace(/\b\d+\b/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (description.length > 100) description = description.substring(0, 100);

    console.log('   📄 Linha', i, '->', {
      data: currentDate,
      descricao: description,
      valor: amount,
      tipo,
    });

    transactions.push({
      data: currentDate,
      descricao: description,
      valor: amount,
      tipo,
      forma_pagamento: 'Santander',
    });

    // se consumimos linhas extras do bloco, avançar o índice para pular as linhas processadas
    if (typeof consumedLines === 'number' && consumedLines > 0) {
      i += consumedLines;
    }
  }

  console.log('🎯 Total extratos Santander:', transactions.length);
  return transactions;
}

function parseGenericPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Regex genérico para transações
  // Procura por: data + descrição + valor
  const patterns = [
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi,
    /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+R?\$?\s*([\d.,]+)/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [, dateStr, description, amountStr] = match;
      
      try {
        // Converter data
        const [day, month, year] = dateStr.split(/[/-]/);
        const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Converter valor
        const amount = parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
        
        if (amount > 0 && description.length > 3) {
          transactions.push({
            data: date,
            descricao: description.trim().substring(0, 100),
            valor: amount,
            tipo: 'despesa' // Padrão, usuário pode ajustar
          });
        }
      } catch (e) {
        // Ignorar linha com erro
      }
    }
  }
  
  return transactions;
}

/**
 * Validar e limpar transações extraídas
 */
export function validateTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  return transactions
    .filter(t => t.valor > 0 && t.descricao.length >= 3)
    .map(t => ({
      ...t,
      descricao: t.descricao.substring(0, 100), // Limitar tamanho
      data: validateDate(t.data)
    }));
}

/**
 * Validar formato de data
 */
function validateDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return dateStr;
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}
