// ============================================
// Página: Importação de Extratos
// Sistema para upload e análise de arquivos
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { PluggyConnect as PluggyConnectType } from 'react-pluggy-connect';

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod: any) => mod.PluggyConnect),
  { ssr: false }
) as typeof PluggyConnectType;
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, Plus, Building2, Unlink, RefreshCw, TrendingUp } from 'lucide-react';
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
          toast({ title: 'Erro de autenticação no banco', description: 'Tente conectar novamente.', variant: 'destructive' });
          setPluggyStep('idle');
          return;
        }
        // UPDATING or unknown — keep waiting
        const secs = (MAX - i) * 3;
        setPluggySyncMsg(`Sincronizando dados do banco... (${secs}s)`);
      } catch {
        // network hiccup, keep trying
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    // Timeout — try to fetch anyway (may have partial data)
    setPluggySyncMsg('');
    try {
      await fetchAccounts(itemId);
    } catch {
      toast({ title: 'Tempo esgotado', description: 'Não foi possível buscar as contas. Tente novamente.', variant: 'destructive' });
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
    toast({ title: 'Banco desconectado', description: 'Conexão removida com sucesso.' });
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
    if (n.includes('poupan')) return 'poupanca';
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
          const description = tx.merchant?.name || tx.description || 'Transação';
          await createTransaction({
            descricao: description.substring(0, 100),
            tipo,
            categoria_id: findCategory(description),
            valor,
            data_transacao: tx.date ? tx.date.split('T')[0] : formatDateISO(new Date()),
            responsavel: user.nome || user.email,
            status: 'pago',
            parcelado: false,
            total_parcelas: 1,
          });
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
      toast({ title: `${total} transações${invMsg} importadas!`, description: 'Banco sincronizado com sucesso!' });
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
      'alimentação': ['mercado', 'supermercado', 'restaurante', 'lanche', 'ifood', 'uber eats', 'padaria'],
      'transporte': ['uber', 'taxi', '99', 'gasolina', 'combustível', 'estacionamento', 'metrô', 'ônibus'],
      'moradia': ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'internet', 'gás'],
      'lazer': ['cinema', 'netflix', 'spotify', 'jogo', 'diversão', 'parque'],
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

      // Verificar se é PDF
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        toast({
          title: 'Processando PDF...',
          description: 'Extraindo transações do arquivo',
        });

        const transactions = await parsePDF(file);
        const validTransactions = validateTransactions(transactions);

        if (validTransactions.length === 0) {
          toast({
            title: 'Nenhuma transação encontrada',
            description: 'Não foi possível extrair transações do PDF',
            variant: 'destructive',
          });
          setUploading(false);
          setFile(null);
          return;
        }

        // Converter para formato padrão
        parsedData = validTransactions.map(t => ({
          data: t.data,
          descrição: t.descricao,
          valor: t.valor, // Manter como número, não converter para string!
          tipo: t.tipo,
          forma_pagamento: t.forma_pagamento || ''
        }));
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
        // Processar XLS/XLSX
        toast({ title: 'Processando planilha...', description: 'Extraindo transações do Excel' });
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
            description: 'O arquivo CSV não contém dados válidos',
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
        const date = row['data'] || row['date'] || row['data transação'] || '';
        const description = row['descrição'] || row['description'] || row['historic'] || row['histórico'] || '';
        const amount = row['valor'] || row['amount'] || row['value'] || '0';

        if (!date || !description) continue;

        // Se o valor já é número (do PDF), usar diretamente
        let numericAmount: number;
        if (typeof amount === 'number') {
          numericAmount = Math.abs(amount);
        } else {
          // Se é string (do CSV), limpar e converter
          const cleanAmount = amount.toString().replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
          numericAmount = Math.abs(parseFloat(cleanAmount) || 0);
        }
        
        if (numericAmount === 0) continue;

        const tipo = row.tipo || (amount.toString().includes('-') || amount.toString().startsWith('(') ? 'despesa' : 'receita');

        let dateISO: string;
        
        // Se já está no formato ISO (YYYY-MM-DD), usar diretamente
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateISO = date;
          console.log('📅 Data do PDF (ISO):', dateISO);
        } else {
          // Converter outras formatações
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
          console.log('📅 Data convertida:', date, '→', dateISO);
        }

        // Sugerir categoria com IA
        const suggestedCategory = await suggestCategory(user.id, description, tipo, categories);
        const categoryId = suggestedCategory || findCategory(description);

        console.log('💾 Salvando transação:', {
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
        });

        // Salvar regra de aprendizado
        if (categoryId) {
          await saveLearnedRule(user.id, description, categoryId, tipo);
        }

        imported++;
        if (tipo === 'receita') receitaCount++;
        if (tipo === 'despesa') despesaCount++;
      }

      console.log('🔢 Resumo importação PDF:', { imported, receitaCount, despesaCount });
      toast({
        title: `${imported} transações importadas!`,
        description: 'O sistema aprendeu novos padrões de categorização',
      });

      // navegar e pedir para a página de transações limpar filtros
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
        title: `${imported} transações importadas!`,
        description: 'As transações foram adicionadas com sucesso',
      });

      setTimeout(() => router.push('/dashboard/transactions'), 1000);
      setManualText('');
    } catch (error) {
      console.error('Erro ao processar importação manual:', error);
      toast({
        title: 'Erro ao importar transações',
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
          title: 'Tipo de arquivo inválido',
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
          Importe transações de arquivos PDF, CSV ou adicione manualmente
        </p>
      </div>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="file">📄 Upload (PDF/CSV)</TabsTrigger>
          <TabsTrigger value="csv">CSV Rápido</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="pluggy">🏦 Banco Direto</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Extrato Bancário</CardTitle>
              <CardDescription>
                Suporta PDF do Nubank e Santander, CSV e Excel • Sistema com aprendizado automático 🧠
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.csv,.xls,.xlsx"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />

                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Clique para selecionar um arquivo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, CSV ou Excel - arraste e solte aqui
                    </p>
                  </label>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                          {file.type === 'application/pdf' && ' • PDF do Nubank/Santander'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="gap-2"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Processar
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Formatos Suportados</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>PDF:</strong> Extratos do Nubank / Santander</p>
                    <p><strong>CSV:</strong> separado por vírgula ou ponto-e-vírgula</p>
                    <p><strong>XLS / XLSX:</strong> planilhas Excel dos bancos</p>
                  </div>
                  <code className="text-xs bg-background p-2 block rounded mt-2">
                    data,descrição,valor<br />
                    15/01/2026,Mercado,-150.50<br />
                    20/01/2026,Salário,3000.00
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">Para XLS/XLSX, a primeira linha deve ser o cabeçalho com as colunas data, descrição e valor.</p>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        🧠 Sistema de Aprendizado Ativo
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        O sistema aprende automaticamente com cada importação! As transações são categorizadas
                        inteligentemente com base em padrões anteriores e palavras-chave.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como funciona?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Selecione o arquivo</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload de extrato bancário - CSV funciona localmente, PDF requer servidor
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Processamento automático</h3>
                    <p className="text-sm text-muted-foreground">
                      O sistema detecta transações, valores e categorias automaticamente
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Pronto!</h3>
                    <p className="text-sm text-muted-foreground">
                      As transações são adicionadas automaticamente ao seu controle financeiro
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cole seus dados CSV</CardTitle>
              <CardDescription>
                Cole o conteúdo do arquivo CSV diretamente aqui
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-text">Dados CSV</Label>
                  <Textarea
                    id="csv-text"
                    placeholder="data,descrição,valor&#10;15/01/2026,Mercado,-150.50&#10;20/01/2026,Salário,3000.00"
                    className="min-h-[200px] font-mono text-sm"
                    disabled={uploading}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Cole o conteúdo completo do CSV incluindo o cabeçalho
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    const textarea = document.getElementById('csv-text') as HTMLTextAreaElement;
                    const csvText = textarea?.value || '';
                    if (!csvText.trim() || !user) return;
                    
                    setUploading(true);
                    try {
                      const parsedData = parseCSV(csvText);
                      if (parsedData.length === 0) {
                        toast({
                          title: 'Dados vazios',
                          description: 'Cole dados CSV válidos',
                          variant: 'destructive',
                        });
                        setUploading(false);
                        return;
                      }

                      let imported = 0;
                      for (const row of parsedData) {
                        const date = row['data'] || row['date'] || '';
                        const description = row['descrição'] || row['description'] || '';
                        const amount = row['valor'] || row['amount'] || '0';

                        if (!date || !description) continue;

                        const cleanAmount = amount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                        const numericAmount = Math.abs(parseFloat(cleanAmount) || 0);
                        if (numericAmount === 0) continue;

                        const tipo = amount.includes('-') ? 'despesa' : 'receita';

                        let dateObj = new Date();
                        try {
                          if (date.includes('/')) {
                            const [d, m, y] = date.split('/');
                            dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                          }
                        } catch (e) {
                          dateObj = new Date();
                        }

                        await createTransaction({
                          descricao: description.substring(0, 100),
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
                        title: `${imported} transações importadas!`,
                        description: 'Sucesso!',
                      });
                      setTimeout(() => router.push('/dashboard/transactions'), 1000);
                      textarea.value = '';
                    } catch (error) {
                      toast({
                        title: 'Erro ao processar CSV',
                        description: 'Verifique o formato',
                        variant: 'destructive',
                      });
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Importar CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Importação Manual</CardTitle>
              <CardDescription>
                Cole suas transações no formato: data;descrição;valor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="manual-text">Transações</Label>
                  <Textarea
                    id="manual-text"
                    placeholder="15/01/2026;Mercado;-150.50&#10;20/01/2026;Salário;3000.00&#10;22/01/2026;Uber;-25.00"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                    disabled={uploading}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Uma transação por linha. Formato: <code>data;descrição;valor</code>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use valores negativos (-) para despesas e positivos para receitas
                  </p>
                </div>

                <Button
                  onClick={handleManualImport}
                  disabled={!manualText.trim() || uploading}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Importar Transações
                    </>
                  )}
                </Button>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Exemplo</h4>
                  <code className="text-xs bg-background p-2 block rounded whitespace-pre">
15/01/2026;Mercado Dia;-150.50
16/01/2026;Uber;-25.00
20/01/2026;Salário Janeiro;3000.00
22/01/2026;Freelance Site;800.00
25/01/2026;Netflix;-39.90
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Dicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Use ponto e vírgula (;) para separar os campos</li>
                <li>Data no formato: DD/MM/AAAA (ex: 15/01/2026)</li>
                <li>Valores negativos são despesas, positivos são receitas</li>
                <li>Use ponto (.) para decimais, não vírgula</li>
                <li>As categorias serão atribuídas automaticamente com base na descrição</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pluggy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Conectar Banco Diretamente
              </CardTitle>
              <CardDescription>
                Importe transações diretamente do seu banco via Open Finance (Pluggy)
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
                          Importar transações
                        </Button>
                        <Button onClick={handlePluggyConnect} className="gap-2" variant="outline">
                          <Building2 className="h-4 w-4" />
                          Conectar outro banco
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-muted rounded-lg space-y-2 text-sm text-muted-foreground">
                        <p>✅ Conecte sua conta bancária de forma segura</p>
                        <p>✅ Mais de 100 bancos brasileiros suportados (Nubank, Itaú, Bradesco, XP, Inter...)</p>
                        <p>✅ As credenciais do banco <strong>nunca</strong> ficam armazenadas aqui</p>
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
                  <p>Abrindo janela de conexão...</p>
                </div>
              )}

              {pluggyStep === 'syncing' && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-semibold">Sincronizando com o banco...</p>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    {pluggySyncMsg || 'Aguarde enquanto o Pluggy busca seus dados bancários. Isso pode levar até 1 minuto.'}
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
                            <p className="text-xs text-muted-foreground">{acc.type} {acc.number ? `• ****${acc.number.slice(-4)}` : ''}</p>
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
                      <Label htmlFor="pluggy-to">Até</Label>
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
                  <p className="text-sm">{pluggyProgress || 'Importando transações...'}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Como funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Clique em <strong>"Conectar meu banco"</strong> — abre a janela segura do Pluggy</p>
              <p>2. Escolha seu banco e autentique com suas credenciais bancárias</p>
              <p>3. Selecione as contas e o período desejado</p>
              <p>4. As transações são importadas automaticamente com categorização inteligente</p>
              <p className="pt-2 text-xs">Requer configuração das credenciais Pluggy em <code>.env.local</code></p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
