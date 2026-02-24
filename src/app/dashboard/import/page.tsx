// ============================================
// Página: Importação de Extratos
// Sistema para upload e análise de arquivos
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, FileSpreadsheet, Plus } from 'lucide-react';
import { createTransaction } from '@/services/transactions.local';
import { getCategories } from '@/services/categories.local';
import { parsePDF, validateTransactions } from '@/services/pdf-parser';
import { suggestCategory, saveLearnedRule } from '@/services/categorization';
import type { Category } from '@/types';
import { formatDateISO } from '@/lib/utils';

export default function ImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (user) {
      getCategories(user.id).then(({ data }) => {
        if (data) setCategories(data);
      });
    }
  }, [user]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      transactions.push(row);
    }

    return transactions;
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
          tipo: t.tipo
        }));
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
        });

        // Salvar regra de aprendizado
        if (categoryId) {
          await saveLearnedRule(user.id, description, categoryId, tipo);
        }

        imported++;
      }

      toast({
        title: `${imported} transações importadas!`,
        description: 'O sistema aprendeu novos padrões de categorização',
      });

      setTimeout(() => router.push('/dashboard/transactions'), 1000);
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
      <div>
        <h1 className="text-3xl font-bold">Importar Extrato</h1>
        <p className="text-muted-foreground">
          Importe transações de arquivos PDF, CSV ou adicione manualmente
        </p>
      </div>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="file">📄 Upload (PDF/CSV)</TabsTrigger>
          <TabsTrigger value="csv">CSV Rápido</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload de Extrato Bancário</CardTitle>
              <CardDescription>
                Suporta PDF do Nubank, CSV e Excel • Sistema com aprendizado automático 🧠
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
                          {file.type === 'application/pdf' && ' • PDF do Nubank'}
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
                    <p><strong>PDF:</strong> Extratos do Nubank (automático)</p>
                    <p><strong>CSV:</strong> data, descrição, valor</p>
                  </div>
                  <code className="text-xs bg-background p-2 block rounded mt-2">
                    data,descrição,valor<br />
                    15/01/2026,Mercado,-150.50<br />
                    20/01/2026,Salário,3000.00
                  </code>
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
      </Tabs>
    </div>
  );
}
