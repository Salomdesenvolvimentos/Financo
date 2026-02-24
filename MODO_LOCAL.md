# 🧪 Modo Local - Finaco

## O que é o Modo Local?

O Modo Local permite testar o Finaco **sem configurar o Supabase**. Todos os dados são armazenados no **localStorage** do navegador, incluindo:

- ✅ Usuário de teste pré-configurado
- ✅ 6 categorias padrão (receitas e despesas)
- ✅ 3 meses de transações de exemplo
- ✅ Todas as funcionalidades do dashboard

## 🚀 Como Usar

### 1. Verificar se está em Modo Local

O sistema detecta automaticamente o modo local quando:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

### 2. Acessar a Aplicação

```bash
npm run dev
```

Acesse: http://localhost:3000 (ou http://localhost:3001)

### 3. Login Automático

Na tela de login, os campos já estão preenchidos:
- **Email:** teste@finaco.com
- **Senha:** 123456

Basta clicar em "Entrar" - qualquer email/senha funciona em modo local!

## 📊 Dados de Exemplo

### Categorias Padrão

**Despesas:**
- 🍔 Alimentação
- 🚗 Transporte
- 🏠 Moradia
- 🎮 Lazer

**Receitas:**
- 💰 Salário
- 💻 Freelance

### Transações de Exemplo

O sistema gera automaticamente transações para os últimos 3 meses:
- Salário mensal de R$ 5.000
- Projeto freelance de R$ 1.500 (mês atual)
- Despesas variadas: aluguel, supermercado, transporte, lazer

## 🔧 Funcionalidades Disponíveis

### ✅ Totalmente Funcionais

- Login/Logout
- Dashboard com gráficos
- Score de saúde financeira (0-100)
- Visualização de transações
- Filtros e busca
- Categorias personalizadas
- Análises por categoria e dia da semana
- Tendência mensal (últimos 6 meses)

### ⚠️ Limitações

- Dados são perdidos ao limpar cache do navegador
- Não é possível testar importação de arquivos
- Insights automáticos não funcionam
- Sem sincronização entre dispositivos

## 🔄 Resetar Dados

Para resetar todos os dados e voltar aos dados de exemplo:

```javascript
// Abra o Console do navegador (F12) e execute:
localStorage.clear();
location.reload();
```

## 📂 Arquivos do Modo Local

```
src/
├── lib/
│   └── local-storage.ts         # Gerenciador do localStorage
├── services/
│   ├── auth.ts                  # Auth com suporte local
│   ├── analytics.local.ts       # Analytics local
│   ├── categories.local.ts      # Categorias local
│   └── transactions.local.ts    # Transações local
└── components/
    └── local-storage-init.tsx   # Inicializador automático
```

## 🚀 Migrar para Supabase

Quando estiver pronto para usar o Supabase em produção:

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script `supabase/schema.sql`
3. Atualize o arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

4. Reinicie o servidor: `npm run dev`

O sistema detectará automaticamente e usará o Supabase real!

## 💡 Dicas

- **Desenvolvimento:** Use o modo local para testar rapidamente
- **Demonstração:** Perfeito para mostrar o sistema sem backend
- **Testes:** Crie cenários de teste sem afetar dados reais
- **Offline:** Funciona completamente offline

## 🐛 Resolução de Problemas

### Problema: Tela em branco
**Solução:** Limpe o localStorage e recarregue
```javascript
localStorage.clear();
location.reload();
```

### Problema: Dados não aparecem
**Solução:** Verifique o console (F12) para erros de inicialização

### Problema: Login não funciona
**Solução:** Confirme que está em modo local:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Deve retornar: http://localhost:54321
```

---

**Modo Local ativado ✅** - Pronto para testar!
