# ⚡ Referência Rápida - Finaco

Comandos e referências essenciais para desenvolvimento.

---

## 🚀 Comandos NPM

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev              # Inicia servidor em http://localhost:3000

# Build
npm run build           # Cria build de produção
npm start              # Inicia build de produção

# Qualidade de código
npm run lint           # Executa ESLint
npm run type-check     # Verifica tipos TypeScript
```

---

## 📁 Estrutura de Arquivos Importantes

```
src/
├── app/
│   ├── page.tsx                    # Login
│   ├── auth/signup/page.tsx        # Cadastro
│   ├── dashboard/page.tsx          # Dashboard
│   ├── transactions/page.tsx       # Transações
│   ├── import/page.tsx            # Importação
│   └── settings/page.tsx          # Configurações
│
├── services/
│   ├── auth.ts                    # Autenticação
│   ├── transactions.ts            # CRUD transações
│   ├── categories.ts              # CRUD categorias
│   └── analytics.ts               # Análises financeiras
│
├── components/
│   ├── ui/                        # Componentes base
│   └── navbar.tsx                 # Navegação
│
├── hooks/
│   ├── use-auth.ts               # Hook autenticação
│   ├── use-toast.ts              # Hook notificações
│   └── use-transactions.ts       # Hook transações
│
├── lib/
│   ├── supabase.ts               # Cliente Supabase
│   ├── utils.ts                  # Utilitários
│   └── constants.ts              # Constantes
│
└── types/
    └── index.ts                   # Tipos TypeScript
```

---

## 🗄️ Tabelas do Banco (Supabase)

```sql
users                    # Usuários
├── id (uuid)
├── email (text)
├── nome (text)
└── created_at (timestamp)

categories              # Categorias
├── id (uuid)
├── user_id (uuid)
├── nome (text)
├── tipo (text)
├── cor (text)
└── created_at (timestamp)

transactions           # Transações
├── id (uuid)
├── user_id (uuid)
├── descricao (text)
├── tipo (text)
├── categoria_id (uuid)
├── valor (decimal)
├── data_transacao (date)
├── status (text)
├── parcelado (boolean)
├── total_parcelas (int)
├── grupo_parcela_id (uuid)
└── [outros campos...]

insights               # Insights
├── id (uuid)
├── user_id (uuid)
├── mensagem (text)
├── nivel (text)
└── created_at (timestamp)

learning_rules         # Regras de aprendizado
├── id (uuid)
├── user_id (uuid)
├── descricao_pattern (text)
├── categoria_id (uuid)
└── tipo (text)
```

---

## 🔐 Variáveis de Ambiente

```env
# .env.local (Desenvolvimento)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

---

## 🎨 Cores do Tema

```css
/* Primárias */
--primary: #3B82F6       /* Azul */
--success: #10B981       /* Verde */
--danger: #EF4444        /* Vermelho */
--warning: #F59E0B       /* Laranja */

/* Neutras */
--background: #FFFFFF    /* Branco */
--foreground: #18181B    /* Preto */
--muted: #F4F4F5        /* Cinza claro */
```

---

## 📊 Funções Principais

### Autenticação

```typescript
import { signIn, signUp, signOut } from '@/services/auth';

// Login
await signIn(email, password);

// Cadastro
await signUp(email, password, nome);

// Logout
await signOut();
```

### Transações

```typescript
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '@/services/transactions';

// Buscar todas
const { data } = await getTransactions(filters);

// Criar nova
await createTransaction(userId, formData);

// Atualizar
await updateTransaction(id, formData);

// Deletar
await deleteTransaction(id);
```

### Análises

```typescript
import {
  getFinancialSummary,
  getCategoryExpenses,
  calculateFinancialScore,
} from '@/services/analytics';

// Resumo mensal
const summary = await getFinancialSummary(userId, month);

// Gastos por categoria
const expenses = await getCategoryExpenses(userId, month, 'despesa');

// Score financeiro
const score = await calculateFinancialScore(userId, month);
```

---

## 🧰 Utilitários Comuns

```typescript
import {
  formatCurrency,
  formatDate,
  formatDateISO,
  getMonthRange,
  calculatePercentage,
} from '@/lib/utils';

// Formatar moeda
formatCurrency(1500.50);  // "R$ 1.500,50"

// Formatar data
formatDate(new Date());    // "21/02/2026"

// Data ISO
formatDateISO(new Date()); // "2026-02-21"

// Range do mês
const { start, end } = getMonthRange(new Date());

// Calcular percentual
calculatePercentage(500, 2000); // 25
```

---

## 🎯 Tipos Principais

```typescript
import type {
  Transaction,
  Category,
  FinancialSummary,
  FinancialScore,
} from '@/types';

// Transação
const transaction: Transaction = {
  id: 'uuid',
  user_id: 'uuid',
  descricao: 'Compra',
  tipo: 'despesa',
  valor: 100,
  // ...
};

// Categoria
const category: Category = {
  id: 'uuid',
  user_id: 'uuid',
  nome: 'Alimentação',
  tipo: 'despesa',
  // ...
};
```

---

## 🔧 Configuração do Supabase

### Criar Cliente

```typescript
import { supabase } from '@/lib/supabase';

// Query simples
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId);

// Insert
await supabase
  .from('transactions')
  .insert([data]);

// Update
await supabase
  .from('transactions')
  .update(data)
  .eq('id', id);

// Delete
await supabase
  .from('transactions')
  .delete()
  .eq('id', id);
```

---

## 🎨 Componentes UI

### Botão

```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Texto</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline">Cancelar</Button>
<Button size="sm">Pequeno</Button>
<Button size="icon"><Icon /></Button>
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```

### Dialog

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    Conteúdo
  </DialogContent>
</Dialog>
```

### Toast

```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: 'Sucesso!',
  description: 'Operação concluída',
  variant: 'success',
});
```

---

## 🐛 Debug

### Ver logs do Supabase

```typescript
const { data, error } = await supabase...;
console.log('Data:', data);
console.log('Error:', error);
```

### Ver estado do usuário

```typescript
import { useAuth } from '@/hooks/use-auth';

const { user, loading } = useAuth();
console.log('User:', user);
```

### Ver erros do Next.js

```bash
# Terminal onde roda npm run dev
# Erros aparecem aqui
```

---

## 📱 Responsividade

```tsx
// Tailwind breakpoints
className="
  sm:text-lg      // 640px+
  md:grid-cols-2  // 768px+
  lg:flex         // 1024px+
  xl:max-w-7xl    // 1280px+
  2xl:px-8        // 1536px+
"
```

---

## ✅ Checklist Antes do Deploy

- [ ] Todas as dependências instaladas
- [ ] Build local sem erros (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] Schema SQL executado no Supabase
- [ ] RLS ativado
- [ ] Testes básicos funcionando
- [ ] README atualizado

---

## 📞 Links Úteis

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)

---

**💡 Dica**: Mantenha esta referência aberta durante o desenvolvimento!
