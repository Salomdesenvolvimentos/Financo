# 💰 Finaco - Sistema Inteligente de Controle Financeiro

<div align="center">

![Finaco Logo](https://img.shields.io/badge/Finaco-Controle%20Financeiro-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)

**Uma plataforma moderna e inteligente para controle financeiro pessoal e empresarial**

[Demonstração](#) • [Documentação](#) • [Reportar Bug](#)

</div>

---

## 📋 Sobre o Projeto

**Finaco** é um sistema web completo de gestão financeira que combina automação, análise de dados e facilidade de uso. Com design moderno estilo SaaS, o Finaco permite importação automática de extratos bancários, classificação inteligente de transações e geração de insights financeiros.

### ✨ Principais Funcionalidades

- 📥 **Importação Inteligente**: Upload de extratos PDF, CSV, OFX e Excel com análise automática
- 📊 **Dashboard Analítico**: Visualizações interativas com gráficos e indicadores financeiros
- 💳 **Sistema de Parcelamento**: Criação automática de parcelas futuras
- 🧠 **Análises Inteligentes**: Insights automáticos sobre seus padrões de consumo
- 🚦 **Score Financeiro**: Indicador de saúde financeira de 0 a 100
- 📅 **Visualização Mensal**: Acompanhe suas finanças por período
- 🔔 **Alertas Automáticos**: Notificações de contas vencidas e gastos atípicos
- 🎨 **Design Moderno**: Interface limpa, intuitiva e responsiva
- 🌙 **Dark Mode**: Tema claro e escuro
- 🔐 **Segurança**: Autenticação robusta com Supabase Auth

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **[Next.js 14](https://nextjs.org/)** - Framework React com App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilização moderna
- **[Shadcn/UI](https://ui.shadcn.com/)** - Componentes reutilizáveis
- **[Recharts](https://recharts.org/)** - Gráficos interativos
- **[Lucide React](https://lucide.dev/)** - Ícones modernos

### Backend & Infraestrutura
- **[Supabase](https://supabase.com/)** - Backend serverless
  - PostgreSQL Database
  - Authentication
  - Row Level Security (RLS)
  - Storage
  - Edge Functions (futuro)

### Deploy
- **[Vercel](https://vercel.com/)** - Hosting e CI/CD

---

## 🚀 Começando

### Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com/)
- Conta no [Vercel](https://vercel.com/) (para deploy)

### Instalação Local

1. **Clone o repositório**

```bash
git clone https://github.com/seu-usuario/finaco.git
cd finaco
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
```

4. **Configure o banco de dados**

Acesse seu projeto no Supabase e execute o script SQL localizado em `supabase/schema.sql` no SQL Editor.

5. **Execute o projeto**

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## 📦 Estrutura do Projeto

```
finaco/
├── src/
│   ├── app/                    # Páginas Next.js (App Router)
│   │   ├── auth/              # Páginas de autenticação
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── transactions/      # Gestão de transações
│   │   ├── import/            # Importação de extratos
│   │   ├── settings/          # Configurações
│   │   ├── layout.tsx         # Layout raiz
│   │   └── page.tsx           # Página inicial (login)
│   │
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes base (Shadcn)
│   │   └── navbar.tsx        # Barra de navegação
│   │
│   ├── services/             # Lógica de negócio
│   │   ├── auth.ts           # Autenticação
│   │   ├── transactions.ts   # Transações
│   │   ├── categories.ts     # Categorias
│   │   └── analytics.ts      # Análises financeiras
│   │
│   ├── hooks/                # React Hooks customizados
│   │   ├── use-auth.ts       # Hook de autenticação
│   │   ├── use-toast.ts      # Hook de notificações
│   │   └── use-transactions.ts
│   │
│   ├── types/                # Tipos TypeScript
│   │   └── index.ts
│   │
│   └── lib/                  # Utilitários
│       ├── supabase.ts       # Cliente Supabase
│       └── utils.ts          # Funções auxiliares
│
├── supabase/
│   └── schema.sql            # Schema do banco de dados
│
├── public/                   # Arquivos estáticos
├── .env.example              # Exemplo de variáveis de ambiente
├── next.config.js            # Configuração Next.js
├── tailwind.config.ts        # Configuração Tailwind
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências do projeto
```

---

## 🎯 Funcionalidades Detalhadas

### 1. Dashboard Inteligente

O dashboard apresenta uma visão completa das suas finanças:

- **Indicadores principais**: Receita, Despesa, Saldo e Alertas
- **Score financeiro**: De 0 a 100, baseado em 4 fatores
- **Gráfico de categorias**: Pizza com distribuição de gastos
- **Gastos por dia da semana**: Identifique padrões de consumo
- **Tendência mensal**: Evolução dos últimos 6 meses

### 2. Gestão de Transações

Tabela completa com todas as funcionalidades:

- CRUD completo (Criar, Ler, Atualizar, Deletar)
- Filtros avançados por tipo, status, categoria e data
- Busca em tempo real
- Edição inline
- Status visual com cores
- Suporte a parcelamento automático

### 3. Sistema de Parcelamento

Ao criar uma compra parcelada:

- O sistema gera automaticamente todas as parcelas
- Distribui nos meses seguintes
- Atualiza status conforme vencimento
- Agrupa parcelas para fácil identificação

### 4. Importação de Extratos

Sistema de upload com processamento inteligente:

- Suporta PDF, CSV, OFX e Excel
- Análise automática de transações
- Sugestão de categorização
- Aprendizado progressivo (futuro)

### 5. Análises e Insights

Geração automática de insights como:

- Categoria com maior gasto
- Dia da semana que você mais gasta
- Alertas de contas vencidas
- Avisos de saldo negativo
- Tendências de consumo

### 6. Score Financeiro

Cálculo baseado em 4 fatores:

1. ✅ Saldo positivo (30 pontos)
2. ✅ Economia adequada >20% (30 pontos)
3. ✅ Sem contas vencidas (20 pontos)
4. ✅ Tendência positiva (20 pontos)

**Níveis**:
- 🟢 80-100: Excelente
- 🔵 60-79: Bom
- 🟡 40-59: Atenção
- 🔴 0-39: Risco

---

## 🔒 Segurança

O Finaco implementa as melhores práticas de segurança:

- **Row Level Security (RLS)**: Cada usuário acessa apenas seus dados
- **Autenticação segura**: Gerenciada pelo Supabase Auth
- **Validação de dados**: No frontend e backend
- **HTTPS obrigatório**: Em produção
- **Tokens JWT**: Para autenticação de API

---

## 🚀 Deploy

### Deploy na Vercel

1. Faça push do código para o GitHub
2. Importe o projeto na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

```bash
# Via CLI da Vercel
vercel --prod
```

### Variáveis de Ambiente (Produção)

Configure no painel da Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-do-supabase
```

---

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção
npm start

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 🎨 Customização

### Cores do Tema

Edite `src/app/globals.css` para personalizar as cores:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --success: 142.1 76.2% 36.3%;
  --danger: 0 84.2% 60.2%;
  /* ... */
}
```

### Categorias Padrão

As categorias padrão são criadas automaticamente no primeiro login.
Para modificar, edite a função `create_default_categories` no `schema.sql`.

---

## 🗺️ Roadmap

### Em Desenvolvimento

- [ ] Integração com bancos via Open Banking
- [ ] App mobile (React Native)
- [ ] Metas financeiras
- [ ] Relatórios em PDF
- [ ] Múltiplos usuários/famílias
- [ ] IA para classificação mais precisa
- [ ] Previsão de gastos futuros
- [ ] Controle de cartões de crédito

### Planejado

- [ ] Controle de investimentos
- [ ] Alertas via WhatsApp
- [ ] Modo offline
- [ ] Exportação para Excel
- [ ] Integração com contador

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abrir um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Finaco Team**

- Website: [finaco.app](#)
- Email: contato@finaco.app

---

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) pela incrível framework
- [Supabase](https://supabase.com/) pela infraestrutura robusta
- [Shadcn/UI](https://ui.shadcn.com/) pelos componentes lindos
- [Vercel](https://vercel.com/) pelo hosting perfeito

---

<div align="center">

**⭐ Se este projeto te ajudou, deixe uma estrela! ⭐**

Feito com ❤️ e muito ☕

</div>
