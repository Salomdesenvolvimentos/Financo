// ============================================
// PÃ¡gina: ImportaÃ§Ã£o de Extratos
// Sistema para upload e anÃ¡lise de arquivos
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PluggyConnect as PluggyConnectType } from 'react-pluggy-connect';

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod: any) => mod.PluggyConnect),
  { ssr: false }
) as typeof PluggyConnectType;
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/hooks/use-plan';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, Plus, Building2, Unlink, RefreshCw, TrendingUp, ChevronDown, ChevronUp, QrCode, ScanLine, Crown, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createTransaction } from '@/services/transactions.local';
import { upsertInvestment } from '@/services/investments.local';
import type { InvestmentType } from '@/types';
import { getCategories } from '@/services/categories.local';
import { parsePDF, validateTransactions } from '@/services/pdf-parser';
import { suggestCategory, saveLearnedRule } from '@/services/categorization';
import type { Category } from '@/types';
import { formatDateISO } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { isPremium } = usePlan();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Pluggy state
  const [pluggyStep, setPluggyStep] = useState<'idle' | 'connecting' | 'syncing' | 'accounts' | 'importing'>('idle');
  const [pluggySyncMsg, setPluggySyncMsg] = useState('');
  const [pluggyAccounts, setPluggyAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [pluggyDateFrom, setPluggyDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [pluggyDateTo, setPluggyDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [pluggyProgress, setPluggyProgress] = useState('');
  const [pluggyToken, setPluggyToken] = useState<string | undefined>();
  const [pluggyOpen, setPluggyOpen] = useState(false);
  const [connectedItemId, setConnectedItemId] = useState<string | null>(null);
  const [connectedItemName, setConnectedItemName] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  // Acordeão para métodos secundários
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showCsvManual, setShowCsvManual] = useState(false);
  const [showNFe, setShowNFe] = useState(false);
  const [nfeText, setNfeText] = useState('');
  const [nfeProcessing, setNfeProcessing] = useState(false);

  // Gerenciar todas as conexões Pluggy
  const [showManageConnections, setShowManageConnections] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const handleLoadAllItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/pluggy/item');
      const data = await res.json();
      setAllItems(data.results ?? data.items ?? []);
    } catch {
      toast({ title: 'Erro ao carregar conexões', variant: 'destructive' });
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    try {
      await fetch(`/api/pluggy/item?itemId=${itemId}`, { method: 'DELETE' });
      setAllItems((prev) => prev.filter((i) => i.id !== itemId));
      // Limpar conexão local se for a ativa
      if (connectedItemId === itemId) {
        localStorage.removeItem('pluggy_item_id');
        localStorage.removeItem('pluggy_item_name');
        setConnectedItemId(null);
        setConnectedItemName('');
        setPluggyAccounts([]);
        setPluggyStep('idle');
      }
      toast({ title: 'Conexão removida com sucesso' });
    } catch {
      toast({ title: 'Erro ao remover conexão', variant: 'destructive' });
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleDeleteAllItems = async () => {
    if (allItems.length === 0) return;
    setLoadingItems(true);
    let deleted = 0;
    for (const item of allItems) {
      try {
        await fetch(`/api/pluggy/item?itemId=${item.id}`, { method: 'DELETE' });
        deleted++;
      } catch {}
    }
    setAllItems([]);
    localStorage.removeItem('pluggy_item_id');
    localStorage.removeItem('pluggy_item_name');
    setConnectedItemId(null);
    setConnectedItemName('');
    setPluggyAccounts([]);
    setPluggyStep('idle');
    setLoadingItems(false);
    toast({ title: `${deleted} conexão(ões) removida(s)`, description: 'Agora você pode conectar novamente.' });
  };

  useEffect(() => {
    if (user) {
      getCategories(user.id).then(({ data }) => {
        if (data) setCategories(data);
      });
    }
    // Restore persisted Pluggy connection
    const savedId = localStorage.getItem('pluggy_item_id');
    const savedName = localStorage.getItem('pluggy_item_name');
    if (savedId) setConnectedItemId(savedId);
    if (savedName) setConnectedItemName(savedName);
  }, [user]);

  const handlePluggyConnect = async () => {
    setPluggyStep('connecting');
    try {
      const res = await fetch('/api/pluggy/token', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPluggyToken(data.accessToken);
      setPluggyOpen(true);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setPluggyStep('idle');
    }
  };

  const fetchAccounts = useCallback(async (itemId: string) => {
    const accRes = await fetch(`/api/pluggy/accounts?itemId=${itemId}`);
    const accData = await accRes.json();
    const accounts = accData.results ?? accData.accounts ?? [];
    setPluggyAccounts(accounts);
    setSelectedAccounts(accounts.map((a: any) => a.id));
    setPluggyStep('accounts');
  }, []);

  const waitForItemAndFetch = useCallback(async (itemId: string) => {
    setPluggyStep('syncing');
    const MAX = 20; // 60 seconds max (20 * 3s)
    for (let i = 0; i < MAX; i++) {
      try {
        const res = await fetch(`/api/pluggy/item?itemId=${itemId}`);
        const data = await res.json();
        const status: string = data.status ?? '';
        if (status === 'UPDATED' || status === 'PARTIAL_SUCCESS') {
          setPluggySyncMsg('');
          await fetchAccounts(itemId);
          return;
        }
        if (status === 'LOGIN_ERROR' || status === 'OUTDATED') {
          toast({ title: 'Erro de autenticaÃ§Ã£o no banco', description: 'Tente conectar novamente.', variant: 'destructive' });
          setPluggyStep('idle');
          return;
        }
        // UPDATING or unknown â€” keep waiting
        const secs = (MAX - i) * 3;
        setPluggySyncMsg(`Sincronizando dados do banco... (${secs}s)`);
      } catch {
        // network hiccup, keep trying
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    // Timeout â€” try to fetch anyway (may have partial data)
    setPluggySyncMsg('');
    try {
      await fetchAccounts(itemId);
    } catch {
      toast({ title: 'Tempo esgotado', description: 'NÃ£o foi possÃ­vel buscar as contas. Tente novamente.', variant: 'destructive' });
      setPluggyStep('idle');
    }
  }, [fetchAccounts, toast]);

  const onPluggySuccess = useCallback(async ({ item }: any) => {
    setPluggyOpen(false);
    // Persist connection
    const itemName = item.connector?.name ?? item.institution?.name ?? 'Banco';
    localStorage.setItem('pluggy_item_id', item.id);
    localStorage.setItem('pluggy_item_name', itemName);
    setConnectedItemId(item.id);
    setConnectedItemName(itemName);
    await waitForItemAndFetch(item.id);
  }, [waitForItemAndFetch]);

  const onPluggyError = useCallback((err: any) => {
    setPluggyOpen(false);
    toast({ title: 'Erro ao conectar banco', description: err?.message ?? 'Tente novamente', variant: 'destructive' });
    setPluggyStep('idle');
  }, [toast]);

  const onPluggyClose = useCallback(() => {
    setPluggyOpen(false);
    if (pluggyStep === 'connecting') setPluggyStep('idle');
  }, [pluggyStep]);

  const handlePluggyDisconnect = async () => {
    if (!connectedItemId) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/pluggy/item?itemId=${connectedItemId}`, { method: 'DELETE' });
    } catch {}
    localStorage.removeItem('pluggy_item_id');
    localStorage.removeItem('pluggy_item_name');
    setConnectedItemId(null);
    setConnectedItemName('');
    setPluggyAccounts([]);
    setPluggyStep('idle');
    setDisconnecting(false);
    toast({ title: 'Banco desconectado', description: 'ConexÃ£o removida com sucesso.' });
  };

  const handlePluggyReload = async () => {
    if (!connectedItemId) return;
    try {
      await fetchAccounts(connectedItemId);
    } catch {
      toast({ title: 'Erro ao buscar contas', variant: 'destructive' });
      setPluggyStep('idle');
    }
  };

  function mapPluggyInvestmentType(type: string, subtype: string, name: string): InvestmentType {
    const t = (type ?? '').toUpperCase();
    const s = (subtype ?? '').toUpperCase();
    const n = (name ?? '').toLowerCase();
    if (t === 'EQUITY' || t === 'ETF') return 'acoes';
    if (n.includes('tesouro') || s.includes('TESOURO')) return 'tesouro_direto';
    if (s.includes('LCI') || s.includes('LCA') || n.includes('lci') || n.includes('lca')) return 'lci_lca';
    if (s.includes('CDB') || n.includes('cdb')) return 'cdb';
    if (t === 'REAL_ESTATE' || s.includes('FII') || n.includes('fii')) return 'fii';
    // Caixinhas (Nubank savings boxes) and savings accounts come as type SAVINGS
    if (t === 'SAVINGS' || n.includes('caixinha') || n.includes('poupan')) return 'poupanca';
    if (t === 'FIXED_INCOME') return 'cdb';
    return 'outro';
  }

  const handlePluggyImport = async () => {
    if (!user || selectedAccounts.length === 0) return;
    setPluggyStep('importing');
    let total = 0;
    try {
      for (const accountId of selectedAccounts) {
        const account = pluggyAccounts.find((a) => a.id === accountId);
        setPluggyProgress(`Importando ${account?.name ?? 'conta'}...`);
        const params = new URLSearchParams({ accountId, from: pluggyDateFrom, to: pluggyDateTo });
        const res = await fetch(`/api/pluggy/transactions?${params}`);
        const data = await res.json();
        const txs: any[] = data.results ?? data.transactions ?? [];
        for (const tx of txs) {
          const tipo = tx.type === 'CREDIT' ? 'receita' : 'despesa';
          const valor = Math.abs(Number(tx.amount));
          if (!valor) continue;
          const description = tx.merchant?.name || tx.description || 'TransaÃ§Ã£o';

          // Detectar modalidade: crÃ©dito vs Ã  vista
          // Pluggy: creditCardMetadata indica crÃ©dito; paymentType tambÃ©m pode ajudar
          const isCredito =
            !!tx.creditCardMetadata ||
            tx.paymentData?.paymentMethod === 'CREDIT_CARD' ||
            (account?.type === 'CREDIT');
          const modalidade: 'a_vista' | 'credito' = isCredito ? 'credito' : 'a_vista';

          // Detectar parcelamento (Pluggy fornece installments.number e installments.total)
          const installmentNumber: number = tx.creditCardMetadata?.installmentNumber ?? tx.installments?.number ?? 1;
          const installmentTotal: number = tx.creditCardMetadata?.totalInstallments ?? tx.installments?.total ?? 1;
          const isParcelado = installmentTotal > 1;

          const txDate = tx.date ? tx.date.split('T')[0] : formatDateISO(new Date());

          await createTransaction({
            descricao: description.substring(0, 100),
            tipo,
            categoria_id: findCategory(description),
            valor,
            data_transacao: txDate,
            responsavel: user!.nome || user!.email,
            status: 'pago',
            parcelado: isParcelado,
            total_parcelas: installmentTotal,
            modalidade_pagamento: modalidade,
          });

          // Se parcelado, criar as parcelas futuras ainda nÃ£o lanÃ§adas
          if (isParcelado && tipo === 'despesa' && installmentNumber < installmentTotal) {
            for (let p = installmentNumber + 1; p <= installmentTotal; p++) {
              const futureDate = new Date(txDate);
              futureDate.setMonth(futureDate.getMonth() + (p - installmentNumber));
              await createTransaction({
                descricao: `${description.substring(0, 80)} (${p}/${installmentTotal})`,
                tipo: 'despesa',
                categoria_id: findCategory(description),
                valor,
                data_transacao: formatDateISO(futureDate),
                responsavel: user!.nome || user!.email,
                status: 'andamento',
                parcelado: true,
                total_parcelas: installmentTotal,
                modalidade_pagamento: 'credito',
              });
            }
          }

          total++;
        }
      }

      // Import investments from connected item
      let invCount = 0;
      if (connectedItemId) {
        setPluggyProgress('Buscando investimentos...');
        try {
          const invRes = await fetch(`/api/pluggy/investments?itemId=${connectedItemId}`);
          const invData = await invRes.json();
          const invs: any[] = invData.results ?? invData.investments ?? [];
          for (const inv of invs) {
            // Skip investments that are closed/redeemed
            const status = (inv.status ?? '').toUpperCase();
            if (status === 'CLOSED' || status === 'REDEEMED') continue;
            // Pluggy field mapping:
            // FIXED_INCOME: amount = applied amount, balance = redemption value (with earnings)
            // EQUITY/ETF: amount = current market value (no cost basis from API)
            const valorAtual = Number(inv.balance ?? inv.amount ?? 0);
            const valorInvestido = Number(inv.amount ?? valorAtual);
            if (!valorAtual && !valorInvestido) continue;
            await upsertInvestment(user.id, {
              nome: (inv.name ?? 'Investimento').substring(0, 100),
              tipo: mapPluggyInvestmentType(inv.type, inv.subtype, inv.name),
              instituicao: inv.institutionName ?? connectedItemName,
              valor_investido: valorInvestido,
              valor_atual: valorAtual || valorInvestido,
              data_inicio: inv.issueDate ? inv.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
              vencimento: inv.dueDate ? inv.dueDate.split('T')[0] : undefined,
              rentabilidade_anual: inv.annualRate ? Number(inv.annualRate) : (inv.lastTwelveMonthsRate ? Number(inv.lastTwelveMonthsRate) : undefined),
              ativo: true,
            });
            invCount++;
          }
        } catch {}
      }

      const invMsg = invCount > 0 ? ` + ${invCount} investimento${invCount > 1 ? 's' : ''}` : '';
      toast({ title: `${total} transaÃ§Ãµes${invMsg} importadas!`, description: 'Banco sincronizado com sucesso!' });
      setPluggyStep('idle');
      setPluggyAccounts([]);
      setTimeout(() => router.push('/dashboard/transactions'), 1000);
    } catch (err: any) {
      toast({ title: 'Erro ao importar', description: err.message, variant: 'destructive' });
      setPluggyStep('accounts');
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim().replace(/"/g, '') || '';
      });
      transactions.push(row);
    }

    return transactions;
  };

  const parseXLSX = async (file: File): Promise<any[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    if (rows.length < 2) return [];
    const headers = (rows[0] as string[]).map((h: string) => String(h).trim().toLowerCase());
    return rows.slice(1).map((row: any[]) => {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]).trim() : ''; });
      return obj;
    }).filter((r: any) => Object.values(r).some(v => v !== ''));
  };

  const findCategory = (description: string): string => {
    const desc = description.toLowerCase();
    
    const keywords: Record<string, string[]> = {
      'alimentaÃ§Ã£o': ['mercado', 'supermercado', 'restaurante', 'lanche', 'ifood', 'uber eats', 'padaria'],
      'transporte': ['uber', 'taxi', '99', 'gasolina', 'combustÃ­vel', 'estacionamento', 'metrÃ´', 'Ã´nibus'],
      'moradia': ['aluguel', 'condomÃ­nio', 'Ã¡gua', 'luz', 'energia', 'internet', 'gÃ¡s'],
      'lazer': ['cinema', 'netflix', 'spotify', 'jogo', 'diversÃ£o', 'parque'],
    };

    for (const category of categories) {
      const catName = category.nome.toLowerCase();
      if (keywords[catName]) {
        for (const keyword of keywords[catName]) {
          if (desc.includes(keyword)) {
            return category.id;
          }
        }
      }
    }

    const defaultCat = categories.find(c => c.tipo === 'despesa');
    return defaultCat?.id || '';
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      let parsedData: any[] = [];

      // Verificar se Ã© PDF
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        toast({
          title: 'Processando PDF...',
          description: 'Extraindo transaÃ§Ãµes do arquivo',
        });

        const transactions = await parsePDF(file);
        const validTransactions = validateTransactions(transactions);

        if (validTransactions.length === 0) {
          toast({
            title: 'Nenhuma transaÃ§Ã£o encontrada',
            description: 'NÃ£o foi possÃ­vel extrair transaÃ§Ãµes do PDF',
            variant: 'destructive',
          });
          setUploading(false);
          setFile(null);
          return;
        }

        // Converter para formato padrÃ£o
        parsedData = validTransactions.map(t => ({
          data: t.data,
          descricao: t.descricao,
          valor: t.valor, // Manter como nÃºmero, nÃ£o converter para string!
          tipo: t.tipo,
          forma_pagamento: t.forma_pagamento || ''
        }));
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
        // Processar XLS/XLSX
        toast({ title: 'Processando planilha...', description: 'Extraindo transaÃ§Ãµes do Excel' });
        parsedData = await parseXLSX(file);
        if (parsedData.length === 0) {
          toast({ title: 'Planilha vazia', description: 'Nenhuma linha encontrada', variant: 'destructive' });
          setUploading(false);
          return;
        }
      } else {
        // Processar CSV
        const text = await file.text();
        parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          toast({
            title: 'Arquivo vazio',
            description: 'O arquivo CSV nÃ£o contÃ©m dados vÃ¡lidos',
            variant: 'destructive',
          });
          setUploading(false);
          return;
        }
      }

      let imported = 0;
      let receitaCount = 0;
      let despesaCount = 0;
      for (const row of parsedData) {
        const date = row['data'] || row['date'] || row['data transaÃ§Ã£o'] || '';
        const description = row['descricao'] || row['descrição'] || row['description'] || row['historic'] || row['historico'] || '';
        const amount = row['valor'] || row['amount'] || row['value'] || '0';

        if (!date || !description) continue;

        // Se o valor jÃ¡ Ã© nÃºmero (do PDF), usar diretamente
        let numericAmount: number;
        if (typeof amount === 'number') {
          numericAmount = Math.abs(amount);
        } else {
          // Se Ã© string (do CSV), limpar e converter
          const cleanAmount = amount.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          numericAmount = Math.abs(parseFloat(cleanAmount) || 0);
        }
        
        if (numericAmount === 0) continue;

        const tipo = row.tipo || (amount.toString().includes('-') || amount.toString().startsWith('(') ? 'despesa' : 'receita');

        let dateISO: string;
        
        // Se jÃ¡ estÃ¡ no formato ISO (YYYY-MM-DD), usar diretamente
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateISO = date;
          console.log('ðŸ“… Data do PDF (ISO):', dateISO);
        } else {
          // Converter outras formataÃ§Ãµes
          let dateObj = new Date();
          try {
            if (date.includes('/')) {
              const [d, m, y] = date.split('/');
              dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            } else if (date.includes('-')) {
              const [y, m, d] = date.split('-');
              dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            }
          } catch (e) {
            dateObj = new Date();
          }
          dateISO = formatDateISO(dateObj);
          console.log('ðŸ“… Data convertida:', date, 'â†’', dateISO);
        }

        // Sugerir categoria com IA
        const suggestedCategory = await suggestCategory(user.id, description, tipo, categories);
        const categoryId = suggestedCategory || findCategory(description);

        console.log('ðŸ’¾ Salvando transaÃ§Ã£o:', {
          descricao: description.substring(0, 30) + '...',
          data: dateISO,
          valor: numericAmount,
          tipo
        });

        await createTransaction({
          descricao: description.substring(0, 100),
          tipo,
          categoria_id: categoryId,
          valor: numericAmount,
          data_transacao: dateISO,
          responsavel: user.nome || user.email,
          status: 'pago',
          parcelado: false,
          total_parcelas: 1,
          forma_pagamento: row['forma_pagamento'] || undefined,
          modalidade_pagamento: row['forma_pagamento']?.toLowerCase().includes('crÃ©d') ||
            row['forma_pagamento']?.toLowerCase().includes('cred')
              ? 'credito'
              : row['forma_pagamento']
              ? 'a_vista'
              : undefined,
        });

        // Salvar regra de aprendizado
        if (categoryId) {
          await saveLearnedRule(user.id, description, categoryId, tipo);
        }

        imported++;
        if (tipo === 'receita') receitaCount++;
        if (tipo === 'despesa') despesaCount++;
      }

      console.log('ðŸ”¢ Resumo importaÃ§Ã£o PDF:', { imported, receitaCount, despesaCount });
      toast({
        title: `${imported} transaÃ§Ãµes importadas!`,
        description: 'O sistema aprendeu novos padrÃµes de categorizaÃ§Ã£o',
      });

      // navegar e pedir para a pÃ¡gina de transaÃ§Ãµes limpar filtros
      setTimeout(() => router.push('/dashboard/transactions?reset=true'), 1000);
      setFile(null);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao importar arquivo',
        description: error instanceof Error ? error.message : 'Verifique o formato do arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleManualImport = async () => {
    if (!manualText.trim() || !user) return;
    setUploading(true);

    try {
      const lines = manualText.split('\n').filter(line => line.trim());
      let imported = 0;

      for (const line of lines) {
        const parts = line.split(';');
        if (parts.length < 3) continue;

        const [dateStr, description, amountStr] = parts;
        
        let dateObj = new Date();
        try {
          const [d, m, y] = dateStr.trim().split('/');
          dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } catch (e) {
          dateObj = new Date();
        }

        const cleanAmount = amountStr.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const numericAmount = Math.abs(parseFloat(cleanAmount) || 0);
        
        if (numericAmount === 0) continue;

        const tipo = amountStr.includes('-') ? 'despesa' : 'receita';

        await createTransaction({
          descricao: description.trim(),
          tipo,
          categoria_id: findCategory(description),
          valor: numericAmount,
          data_transacao: formatDateISO(dateObj),
          responsavel: user.nome || user.email,
          status: 'pago',
          parcelado: false,
          total_parcelas: 1,
        });

        imported++;
      }

      toast({
        title: `${imported} transaÃ§Ãµes importadas!`,
        description: 'As transaÃ§Ãµes foram adicionadas com sucesso',
      });

      setTimeout(() => router.push('/dashboard/transactions'), 1000);
      setManualText('');
    } catch (error) {
      console.error('Erro ao processar importaÃ§Ã£o manual:', error);
      toast({
        title: 'Erro ao importar transaÃ§Ãµes',
        description: 'Verifique o formato dos dados',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      const validTypes = [
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.pdf')) {
        toast({
          title: 'Tipo de arquivo invÃ¡lido',
          description: 'Por favor, selecione um arquivo PDF, CSV ou Excel',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {pluggyOpen && pluggyToken && (
        <PluggyConnect
          connectToken={pluggyToken}
          includeSandbox={false}
          onSuccess={onPluggySuccess}
          onError={onPluggyError}
          onClose={onPluggyClose}
        />
      )}
      <div>
        <h1 className="text-3xl font-bold">Importar Extrato</h1>
        <p className="text-muted-foreground">
          Conecte seu banco diretamente ou importe arquivos PDF, CSV e NF-e
        </p>
      </div>

      {/* ===== BLOCO PRINCIPAL: BANCO DIRETO (Open Finance) ===== */}
      {isPremium ? (
        <Card className="border-primary/40 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Conectar Banco Diretamente
            <span className="ml-1 text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">Recomendado</span>
          </CardTitle>
          <CardDescription>
            Importe transaÃ§Ãµes diretamente do seu banco via Open Finance (Pluggy) â€” mais de 100 bancos brasileiros
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pluggyStep === 'idle' && (
            <div className="space-y-6">
              {connectedItemId ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 dark:text-green-200">Banco conectado</p>
                      <p className="text-sm text-green-700 dark:text-green-300">{connectedItemName}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePluggyDisconnect}
                      disabled={disconnecting}
                      className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      {disconnecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                      Desconectar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button onClick={handlePluggyReload} className="gap-2" variant="default">
                      <RefreshCw className="h-4 w-4" />
                      Importar transaÃ§Ãµes
                    </Button>
                    <Button onClick={handlePluggyConnect} className="gap-2" variant="outline">
                      <Building2 className="h-4 w-4" />
                      Conectar outro banco
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>ConexÃ£o segura â€” credenciais nunca armazenadas aqui</span>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Nubank, ItaÃº, Bradesco, XP, Inter e +100 bancos</span>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Parcelas detectadas automaticamente</span>
                    </div>
                  </div>
                  <Button onClick={handlePluggyConnect} className="w-full gap-2" size="lg">
                    <Building2 className="h-4 w-4" />
                    Conectar meu banco
                  </Button>
                </>
              )}
            </div>
          )}

          {pluggyStep === 'connecting' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Abrindo janela de conexÃ£o...</p>
            </div>
          )}

          {pluggyStep === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-semibold">Sincronizando com o banco...</p>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {pluggySyncMsg || 'Aguarde enquanto o Pluggy busca seus dados bancÃ¡rios. Isso pode levar atÃ© 1 minuto.'}
              </p>
            </div>
          )}

          {pluggyStep === 'accounts' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Contas encontradas ({pluggyAccounts.length})</h3>
                {pluggyAccounts.length === 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Nenhuma conta encontrada</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">O banco pode estar demorando para sincronizar. Tente aguardar e importar novamente.</p>
                    <Button size="sm" className="mt-3 gap-2" onClick={() => waitForItemAndFetch(connectedItemId!)}>
                      <RefreshCw className="h-3 w-3" />
                      Tentar novamente
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  {pluggyAccounts.map((acc) => (
                    <label key={acc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={selectedAccounts.includes(acc.id)}
                        onChange={(e) => {
                          setSelectedAccounts(e.target.checked
                            ? [...selectedAccounts, acc.id]
                            : selectedAccounts.filter((id) => id !== acc.id)
                          );
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.type} {acc.number ? `â€¢ ****${acc.number.slice(-4)}` : ''}</p>
                      </div>
                      {acc.balance != null && (
                        <span className="text-sm font-semibold text-right">
                          R$ {Number(acc.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pluggy-from">De</Label>
                  <Input id="pluggy-from" type="date" value={pluggyDateFrom} onChange={(e) => setPluggyDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pluggy-to">AtÃ©</Label>
                  <Input id="pluggy-to" type="date" value={pluggyDateTo} onChange={(e) => setPluggyDateTo(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setPluggyStep('idle'); setPluggyAccounts([]); }} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handlePluggyImport}
                  disabled={selectedAccounts.length === 0}
                  className="flex-1 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Importar {selectedAccounts.length > 0 ? `(${selectedAccounts.length} conta${selectedAccounts.length > 1 ? 's' : ''})` : ''}
                </Button>
              </div>
            </div>
          )}

          {pluggyStep === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">{pluggyProgress || 'Importando transaÃ§Ãµes...'}</p>
            </div>
          )}
        </CardContent>
      </Card>
      ) : (
        /* Usuário Free — mostra banner de upgrade */
        <Card className="border-amber-300 dark:border-amber-700 shadow-md">
          <CardContent className="py-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Crown className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">Open Finance é exclusivo do plano Premium</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Conecte seu banco diretamente e importe transações automaticamente de mais de 100 bancos brasileiros.
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center gap-2 justify-center"><CheckCircle className="h-4 w-4 text-green-500" /> Nubank, Itaú, Bradesco, XP, Inter e +100</p>
              <p className="flex items-center gap-2 justify-center"><CheckCircle className="h-4 w-4 text-green-500" /> Parcelas detectadas automaticamente</p>
              <p className="flex items-center gap-2 justify-center"><CheckCircle className="h-4 w-4 text-green-500" /> Conexão segura via Pluggy</p>
            </div>
            <Link href="/dashboard/subscription">
              <Button size="lg" className="gap-2 mt-2">
                <Crown className="h-4 w-4" />
                Fazer upgrade para Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ===== GERENCIAR CONEXÕES PLUGGY ===== */}
      {isPremium && (
        <div className="rounded-xl border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left"
            onClick={() => {
              setShowManageConnections(!showManageConnections);
              if (!showManageConnections) handleLoadAllItems();
            }}
          >
            <div className="flex items-center gap-3">
              <Unlink className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Gerenciar conexões Pluggy</p>
                <p className="text-xs text-muted-foreground">Visualize e exclua itens cadastrados — útil se atingiu o limite</p>
              </div>
            </div>
            {showManageConnections ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showManageConnections && (
            <div className="px-5 pb-5 pt-3 border-t border-border space-y-3">
              {loadingItems ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : allItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conexão encontrada na sua conta Pluggy.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{allItems.length} conexão(ões) encontrada(s)</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAllItems}
                      disabled={loadingItems}
                      className="gap-2 text-xs"
                    >
                      <Unlink className="h-3 w-3" />
                      Excluir todas
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {allItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.connector?.name ?? item.institution?.name ?? 'Banco desconhecido'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.id}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: <span className={item.status === 'UPDATED' ? 'text-green-600' : 'text-orange-500'}>{item.status ?? 'desconhecido'}</span>
                            {item.createdAt && <> · criado em {new Date(item.createdAt).toLocaleDateString('pt-BR')}</>}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 ml-3 shrink-0"
                        >
                          {deletingItemId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                          Excluir
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Após excluir, clique em "Conectar meu banco" acima para criar uma nova conexão.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== ACORDEÃO: UPLOAD PDF/CSV/XLSX ===== */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left"
          onClick={() => setShowFileUpload(!showFileUpload)}
        >
          <div className="flex items-center gap-3">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Upload de Arquivo (PDF / CSV / Excel)</p>
              <p className="text-xs text-muted-foreground">Nubank, Santander, OFX, XLSX e outros</p>
            </div>
          </div>
          {showFileUpload ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showFileUpload && (
          <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-10 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.csv,.xls,.xlsx"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Clique para selecionar ou arraste o arquivo</p>
                <p className="text-xs text-muted-foreground">PDF, CSV, XLS, XLSX</p>
              </label>
            </div>
            {file && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={uploading} size="sm" className="gap-2">
                  {uploading ? <><Loader2 className="h-3 w-3 animate-spin" />Processando...</> : <><CheckCircle className="h-3 w-3" />Processar</>}
                </Button>
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
              <p><strong>CSV esperado:</strong> data, descriÃ§Ã£o, valor</p>
              <p><strong>PDF:</strong> Nubank e Santander suportados</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== ACORDEÃƒO: CSV/TEXTO MANUAL ===== */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left"
          onClick={() => setShowCsvManual(!showCsvManual)}
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Colar CSV ou texto manual</p>
              <p className="text-xs text-muted-foreground">Cole dados no formato data;descriÃ§Ã£o;valor</p>
            </div>
          </div>
          {showCsvManual ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showCsvManual && (
          <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
            <Textarea
              placeholder={"data,descriÃ§Ã£o,valor\n15/01/2026,Mercado,-150.50\n20/01/2026,SalÃ¡rio,3000.00"}
              className="min-h-[160px] font-mono text-sm"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              disabled={uploading}
            />
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2"
                disabled={!manualText.trim() || uploading}
                onClick={async () => {
                  if (!manualText.trim() || !user) return;
                  setUploading(true);
                  try {
                    const isSemicolon = manualText.includes(';');
                    const parsedData = isSemicolon
                      ? manualText.split('\n').filter(l => l.trim()).map(line => {
                          const [d, desc, val] = line.split(';');
                          return { data: d?.trim(), descricao: desc?.trim(), valor: val?.trim() };
                        })
                      : parseCSV(manualText);
                    let imported = 0;
                    for (const row of parsedData) {
                      const date = row['data'] || row['date'] || '';
                      const description = row['descricao'] || row['descrição'] || row['description'] || '';
                      const amount = row['valor'] || row['amount'] || '0';
                      if (!date || !description) continue;
                      const cleanAmount = amount.toString().replace('R$','').replace(/\./g,'').replace(',','.').trim();
                      const numericAmount = Math.abs(parseFloat(cleanAmount) || 0);
                      if (!numericAmount) continue;
                      const tipo: 'despesa' | 'receita' = amount.toString().includes('-') ? 'despesa' : 'receita';
                      let dateISO = '';
                      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) { dateISO = date; }
                      else if (date.includes('/')) {
                        const [d, m, y] = date.split('/');
                        dateISO = formatDateISO(new Date(parseInt(y), parseInt(m)-1, parseInt(d)));
                      } else { dateISO = formatDateISO(new Date()); }
                      await createTransaction({
                        descricao: description.substring(0, 100), tipo,
                        categoria_id: findCategory(description), valor: numericAmount,
                        data_transacao: dateISO, responsavel: user.nome || user.email,
                        status: 'pago', parcelado: false, total_parcelas: 1,
                      });
                      imported++;
                    }
                    toast({ title: `${imported} transaÃ§Ãµes importadas!` });
                    setManualText('');
                    setTimeout(() => router.push('/dashboard/transactions'), 800);
                  } catch { toast({ title: 'Erro ao processar', variant: 'destructive' }); }
                  finally { setUploading(false); }
                }}
              >
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</> : <><Plus className="h-4 w-4" />Importar</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Formato manual: <code>15/01/2026;Mercado;-150.50</code> (uma por linha)</p>
          </div>
        )}
      </div>

      {/* ===== ACORDEÃƒO: NF-e QR CODE ===== */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-card hover:bg-muted/50 transition-colors text-left"
          onClick={() => setShowNFe(!showNFe)}
        >
          <div className="flex items-center gap-3">
            <QrCode className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Leitura de Nota Fiscal (NF-e)</p>
              <p className="text-xs text-muted-foreground">Cole o conteÃºdo do QR Code da NF-e para importar itens automaticamente</p>
            </div>
          </div>
          {showNFe ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showNFe && (
          <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-semibold">Como usar:</p>
              <p>1. Abra o app da cÃ¢mera ou um leitor de QR Code</p>
              <p>2. Escaneie o QR Code da nota fiscal (cupom fiscal / NF-e)</p>
              <p>3. Copie a URL gerada e cole no campo abaixo</p>
              <p>4. O sistema identificarÃ¡ os itens e os distribuirÃ¡ por categoria</p>
            </div>
            <Textarea
              placeholder="Cole aqui a URL do QR Code da NF-e ou o texto da nota..."
              className="min-h-[120px] font-mono text-sm"
              value={nfeText}
              onChange={(e) => setNfeText(e.target.value)}
              disabled={nfeProcessing}
            />
            <Button
              className="w-full gap-2"
              disabled={!nfeText.trim() || nfeProcessing}
              onClick={async () => {
                if (!nfeText.trim() || !user) return;
                setNfeProcessing(true);
                try {
                  // CategorizaÃ§Ã£o heurÃ­stica por palavras-chave comuns em NF-e
                  const alimentacaoKw = ['leite','pÃ£o','arroz','feijÃ£o','frango','carne','biscoito','iogurte','queijo','suco','refrigerante','Ã¡gua','cerveja','cafÃ©','aÃ§Ãºcar','macarrÃ£o','atum','sardinha','farinha','oleo','Ã³leo','manteiga'];
                  const limpezaKw = ['detergente','sabÃ£o','sabonete','shampoo','condicionador','desinfetante','alvejante','esponja','papel higiÃªnico','papel toalha','fralda'];
                  const higKw = ['creme dental','fio dental','desodorante','absorvente','barbear','escova'];
                  const lines = nfeText.split('\n').filter(l => l.trim());
                  let imported = 0;
                  for (const line of lines) {
                    const lower = line.toLowerCase();
                    let catNome = 'Compras';
                    if (alimentacaoKw.some(k => lower.includes(k))) catNome = 'AlimentaÃ§Ã£o';
                    else if (limpezaKw.some(k => lower.includes(k))) catNome = 'Limpeza';
                    else if (higKw.some(k => lower.includes(k))) catNome = 'Higiene';
                    const amountMatch = line.match(/R?\$?\s*([\d.,]+)/);
                    const valor = amountMatch ? Math.abs(parseFloat(amountMatch[1].replace(',','.'))) : 0;
                    if (!valor) continue;
                    const catId = categories.find(c => c.nome.toLowerCase().includes(catNome.toLowerCase()))?.id || '';
                    await createTransaction({
                      descricao: line.substring(0, 80), tipo: 'despesa',
                      categoria_id: catId, valor,
                      data_transacao: formatDateISO(new Date()),
                      responsavel: user.nome || user.email,
                      status: 'pago', parcelado: false, total_parcelas: 1,
                    });
                    imported++;
                  }
                  if (imported === 0) {
                    toast({ title: 'Nenhum item identificado', description: 'Cole o texto completo da NF-e ou a URL do QR Code', variant: 'destructive' });
                  } else {
                    toast({ title: `${imported} itens importados da NF-e!` });
                    setNfeText('');
                    setTimeout(() => router.push('/dashboard/transactions'), 800);
                  }
                } catch { toast({ title: 'Erro ao processar NF-e', variant: 'destructive' }); }
                finally { setNfeProcessing(false); }
              }}
            >
              {nfeProcessing ? <><Loader2 className="h-4 w-4 animate-spin" />Processando NF-e...</> : <><ScanLine className="h-4 w-4" />Importar NF-e</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
