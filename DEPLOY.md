# 🚀 Guia de Deploy - Finaco

Este guia fornece instruções detalhadas para fazer o deploy do Finaco em produção.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Conta no [Supabase](https://supabase.com/)
- ✅ Conta no [Vercel](https://vercel.com/)
- ✅ Repositório Git (GitHub, GitLab ou Bitbucket)
- ✅ Node.js 18+ instalado localmente

---

## 🗄️ Parte 1: Configurar Supabase

### 1.1 Criar Projeto

1. Acesse [https://app.supabase.com/](https://app.supabase.com/)
2. Clique em "New Project"
3. Escolha:
   - Nome do projeto: `finaco`
   - Database Password: Crie uma senha forte
   - Região: Escolha a mais próxima dos seus usuários
4. Aguarde a criação (2-3 minutos)

### 1.2 Executar Schema SQL

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Copie todo o conteúdo do arquivo `supabase/schema.sql`
4. Cole no editor e clique em **Run**
5. Aguarde a execução completa

### 1.3 Obter Credenciais

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Importante**: Guarde essas credenciais em local seguro!

---

## 🚀 Parte 2: Deploy na Vercel

### 2.1 Preparar Repositório

1. Faça commit de todo o código:

```bash
git add .
git commit -m "Preparar para deploy"
git push origin main
```

### 2.2 Importar na Vercel

1. Acesse [https://vercel.com/](https://vercel.com/)
2. Clique em **"Add New Project"**
3. Importe seu repositório do GitHub
4. Configure o projeto:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2.3 Configurar Variáveis de Ambiente

1. Na seção **Environment Variables**, adicione:

```
NEXT_PUBLIC_SUPABASE_URL=sua-url-do-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

2. Clique em **Deploy**

### 2.4 Aguardar Deploy

O processo leva cerca de 2-3 minutos. Você verá:

- ✅ Building
- ✅ Deploying
- ✅ Ready

---

## ✅ Parte 3: Verificação

### 3.1 Testar a Aplicação

1. Acesse a URL fornecida pela Vercel (ex: `finaco.vercel.app`)
2. Teste o cadastro de usuário
3. Faça login
4. Crie uma transação de teste
5. Verifique se os gráficos carregam

### 3.2 Verificar Supabase

1. No Supabase, vá em **Table Editor**
2. Verifique se as tabelas têm os dados do teste
3. Verifique se o usuário foi criado em **Authentication** → **Users**

---

## 🌐 Parte 4: Domínio Personalizado (Opcional)

### 4.1 Adicionar Domínio

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em **Add**
3. Digite seu domínio (ex: `finaco.com.br`)
4. Siga as instruções para configurar DNS

### 4.2 Configurar DNS

No seu provedor de domínio, adicione:

```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

Aguarde propagação (até 48h, geralmente 15min).

---

## 🔧 Troubleshooting

### Erro: "Invalid API Key"

**Solução**: Verifique se as variáveis de ambiente estão corretas na Vercel.

### Erro: "Failed to fetch"

**Solução**: 
1. Verifique se o RLS está ativo no Supabase
2. Confirme que as políticas foram criadas
3. Teste as credenciais localmente

### Erro de Build

**Solução**:
1. Verifique erros no log da Vercel
2. Execute `npm run build` localmente
3. Corrija erros de TypeScript

### Banco não criado

**Solução**:
1. Execute o schema.sql novamente
2. Verifique permissões no Supabase
3. Confirme que não há erros SQL

---

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
git add .
git commit -m "Descrição da atualização"
git push origin main
```

A Vercel fará o deploy automático! 🚀

---

## 📊 Monitoramento

### Vercel Analytics

1. Ative Analytics na Vercel
2. Acompanhe:
   - Visitantes
   - Performance
   - Erros

### Supabase Dashboard

1. Monitore no Supabase:
   - Uso do banco
   - Requisições
   - Armazenamento

---

## 🔐 Segurança em Produção

### Checklist de Segurança

- ✅ RLS ativado em todas as tabelas
- ✅ Variáveis de ambiente configuradas
- ✅ HTTPS ativo (padrão na Vercel)
- ✅ Senhas fortes no Supabase
- ✅ Rate limiting configurado

### Backup

Configure backups automáticos no Supabase:

1. Vá em **Settings** → **Database**
2. Ative **Point in Time Recovery**

---

## 📞 Suporte

Se tiver problemas:

1. Consulte a [documentação do Next.js](https://nextjs.org/docs)
2. Veja a [documentação do Supabase](https://supabase.com/docs)
3. Confira os [logs da Vercel](https://vercel.com/docs/concepts/deployments/logs)

---

**🎉 Parabéns! Seu Finaco está no ar!**

Acesse sua aplicação e comece a usar! 💰
