// ============================================
// FINACO - Serviço de Categorização Inteligente
// Sistema de aprendizado de máquina para categorias
// ============================================

'use client';

import { supabase } from '@/lib/supabase';
import type {  Category } from '@/types';

interface LearningRule {
  id: string;
  user_id: string;
  descricao_pattern: string;
  categoria_id: string;
  tipo: 'receita' | 'despesa';
  confianca: number;
}

/**
 * Sugere categoria baseada em regras aprendidas e palavras-chave
 */
export async function suggestCategory(
  userId: string,
  description: string,
  tipo: 'receita' | 'despesa',
  categories: Category[]
): Promise<string | null> {
  const desc = description.toLowerCase();
  
  // 1. Verificar regras aprendidas
  const learnedCategory = await checkLearnedRules(userId, desc, tipo);
  if (learnedCategory) return learnedCategory;
  
  // 2. Usar palavras-chave padrão
  const keywordCategory = findCategoryByKeywords(desc, tipo, categories);
  if (keywordCategory) return keywordCategory;
  
  // 3. Retornar categoria padrão
  const defaultCategory = categories.find(c => c.tipo === tipo && c.nome === 'Outros');
  return defaultCategory?.id || null;
}

/**
 * Verifica regras aprendidas anteriormente
 */
async function checkLearnedRules(
  userId: string,
  description: string,
  tipo: 'receita' | 'despesa'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('learning_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('tipo', tipo)
      .order('confianca', { ascending: false });
    
    if (error || !data) return null;
    
    const rules = data as LearningRule[];
    
    // Procurar por padrões que correspondam
    for (const rule of rules) {
      const pattern = rule.descricao_pattern.toLowerCase();
      
      // Verificar se o padrão está contido na descrição
      if (description.includes(pattern)) {
        return rule.categoria_id;
      }
      
      // Verificar correspondência fuzzy (palavras semelhantes)
      if (fuzzyMatch(description, pattern)) {
        return rule.categoria_id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao verificar regras:', error);
    return null;
  }
}

/**
 * Salva nova regra de aprendizado
 */
export async function saveLearnedRule(
  userId: string,
  description: string,
  categoryId: string,
  tipo: 'receita' | 'despesa'
): Promise<void> {
  try {
    // Extrair palavras-chave principais da descrição
    const keywords = extractKeywords(description);
    
    for (const keyword of keywords) {
      // Verificar se já existe regra para esse padrão
      const { data: existing } = await supabase
        .from('learning_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('descricao_pattern', keyword)
        .single();
      
      if (existing) {
        // Atualizar confiança da regra existente
        await supabase
          .from('learning_rules')
          .update({ 
            confianca: (existing as LearningRule).confianca + 1,
            categoria_id: categoryId  // Atualizar para categoria mais recente
          })
          .eq('id', (existing as LearningRule).id);
      } else {
        // Criar nova regra
        await supabase
          .from('learning_rules')
          .insert({
            user_id: userId,
            descricao_pattern: keyword,
            categoria_id: categoryId,
            tipo,
            confianca: 1
          });
      }
    }
  } catch (error) {
    console.error('Erro ao salvar regra:', error);
  }
}

/**
 * Extrai palavras-chave principais de uma descrição
 */
function extractKeywords(description: string): string[] {
  const desc = description.toLowerCase()
    .replace(/[^\w\sá-úâ-ûã-õç]/g, ' ') // Remove pontuação
    .trim();
  
  const words = desc.split(/\s+/);
  
  // Remover palavras muito comuns (stop words)
  const stopWords = new Set([
    'de', 'da', 'do', 'em', 'no', 'na', 'com', 'para', 'por', 
    'a', 'o', 'e', 'é', 'um', 'uma', 'os', 'as', 'dos', 'das',
    'compra', 'pagamento', 'transação', 'transferência'
  ]);
  
  const keywords = words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 3); // Pegar as 3 primeiras palavras relevantes
  
  return keywords;
}

/**
 * Correspondência fuzzy entre duas strings
 */
function fuzzyMatch(text: string, pattern: string): boolean {
  // Verificar se pelo menos 70% dos caracteres do padrão estão no texto
  const patternChars = pattern.split('');
  let matches = 0;
  
  for (const char of patternChars) {
    if (text.includes(char)) {
      matches++;
    }
  }
  
  return matches / patternChars.length >= 0.7;
}

/**
 * Encontra categoria baseada em palavras-chave padrão
 */
function findCategoryByKeywords(
  description: string,
  tipo: 'receita' | 'despesa',
  categories: Category[]
): string | null {
  const keywords: Record<string, string[]> = {
    'alimentação': [
      'mercado', 'supermercado', 'restaurante', 'lanche', 'ifood', 'uber eats',
      'padaria', 'açougue', 'feira', 'comida', 'alimento', 'pizza', 'hamburger',
      'delivery', 'rappi', 'mc', 'burger', 'subway', 'café', 'bar'
    ],
    'transporte': [
      'uber', 'taxi', '99', 'gasolina', 'combustível', 'posto', 'shell',
      'estacionamento', 'metrô', 'ônibus', 'bus', 'pedágio'
    ],
    'moradia': [
      'aluguel', 'condomínio', 'água', 'luz', 'energia', 'eletricidade',
      'internet', 'gás', 'enel', 'sabesp', 'copel', 'cemig'
    ],
    'saúde': [
      'farmácia', 'drogaria', 'remédio', 'medicamento', 'hospital',
      'clínica', 'médico', 'dentista', 'laboratório', 'exame'
    ],
    'lazer': [
      'cinema', 'netflix', 'spotify', 'prime', 'disney', 'jogo', 'game',
      'diversão', 'parque', 'show', 'evento', 'teatro', 'ingresso'
    ],
    'educação': [
      'escola', 'faculdade', 'universidade', 'curso', 'livro', 'material',
      'escolar', 'estudo', 'aula'
    ],
    'compras': [
      'loja', 'magazine', 'amazon', 'mercado livre', 'shopee', 'shein',
      'casas bahia', 'extra', 'carrefour'
    ],
    'contas': [
      'boleto', 'fatura', 'conta', 'cobrança', 'pagamento', 'mensalidade'
    ],
    'salário': [
      'salário', 'pagamento', 'vencimento', 'ordenado', 'remuneração'
    ],
    'freelance': [
      'freelance', 'freela', 'projeto', 'serviço', 'trabalho', 'job'
    ],
    'investimentos': [
      'dividendo', 'rendimento', 'investimento', 'aplicação', 'cdb',
      'fundo', 'ação', 'bolsa'
    ]
  };
  
  // Procurar categoria correspondente
  for (const category of categories) {
    const catName = category.nome.toLowerCase();
    const catKeywords = keywords[catName];
    
    if (catKeywords && category.tipo === tipo) {
      for (const keyword of catKeywords) {
        if (description.includes(keyword)) {
          return category.id;
        }
      }
    }
  }
  
  return null;
}

/**
 * Estatísticas de aprendizado do usuário
 */
export async function getLearningStats(userId: string): Promise<{
  totalRules: number;
  avgConfidence: number;
  topPatterns: Array<{ pattern: string; confidence: number }>;
}> {
  try {
    const { data, error } = await supabase
      .from('learning_rules')
      .select('descricao_pattern, confianca')
      .eq('user_id', userId)
      .order('confianca', { ascending: false })
      .limit(10);
    
    if (error || !data) {
      return { totalRules: 0, avgConfidence: 0, topPatterns: [] };
    }
    
    const rules = data as Array<{ descricao_pattern: string; confianca: number }>;
    const totalRules = rules.length;
    const avgConfidence = rules.reduce((sum, r) => sum + r.confianca, 0) / totalRules || 0;
    const topPatterns = rules.slice(0, 5).map(r => ({ 
      pattern: r.descricao_pattern, 
      confidence: r.confianca 
    }));
    
    return { totalRules, avgConfidence, topPatterns };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return { totalRules: 0, avgConfidence: 0, topPatterns: [] };
  }
}
