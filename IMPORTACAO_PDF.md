# 📄 Sistema de Importação de PDF e Aprendizado Automático

## ✅ Funcionalidades Implementadas

### 1. **Processamento de PDF do Nubank e Santander**
- ✅ Extração automática de transações de extratos PDF
- ✅ Detecção inteligente de datas, descrições e valores
- ✅ Suporte para múltiplos formatos de extrato do Nubank
- ✅ Parser genérico para outros bancos

### 2. **Sistema de Aprendizado de Máquina**
- ✅ Categorização inteligente baseada em padrões aprendidos
- ✅ Salva regras de categorização automaticamente
- ✅ Aprende com cada importação realizada
- ✅ Palavras-chave predefinidas para categorias comuns

### 3. **Banco de Dados**
- ✅ Tabela `learning_rules` para armazenar padrões aprendidos
- ✅ Sistema de confiança para regras (quanto mais usado, mais confiável)
- ✅ Associação de padrões com categorias específicas

---

## 🚀 Como Usar

### **Importar PDF do Nubank ou Santander:**

1. Acesse **Dashboard** → **Importar**
2. Clique na aba **"📄 Upload (PDF/CSV)"**
3. Selecione seu extrato PDF do Nubank ou Santander
4. Clique em **"Processar"**
5. As transações serão importadas automaticamente com categorias sugeridas

### **O Sistema Aprende Automaticamente:**

Cada vez que você importa transações, o sistema:
- 🧠 Extrai palavras-chave das descrições
- 💾 Salva padrões na tabela `learning_rules`
- 📈 Aumenta a confiança de padrões repetidos
- 🎯 Sugere categorias mais precisas na próxima importação

---

## 📊 Exemplos de Padrões Aprendidos

| Descrição da Transação | Palavra-chave Extraída | Categoria Aprendida |
|------------------------|------------------------|---------------------|
| Compra no débito - MERCADO ABC | mercado | Alimentação |
| Uber *TRIP | uber | Transporte |
| Netflix.com | netflix | Lazer |
| Farmácia Popular | farmácia | Saúde |

---

## 🔧 Arquivos Criados

### 1. **`src/services/pdf-parser.ts`**
- Processa PDFs e extrai transações
- Parser específico para Nubank
- Parser genérico para outros bancos
- Validação e formatação de dados

### 2. **`src/services/categorization.ts`**
- Sistema de categorização inteligente
- Gerenciamento de regras de aprendizado
- Correspondência fuzzy de padrões
- Estatísticas de aprendizado

### 3. **`src/app/dashboard/import/page.tsx `** (atualizado)
- Interface melhorada para upload de PDF
- Integração com sistema de aprendizado
- Feedback sobre processamento
- Informações sobre categorização automática

---

## 🎯 Benefícios

### **Para o Usuário:**
- ⏱️ Economia de tempo na categorização manual
- 📊 Precisão aumenta com o uso
- 🎯 Categorias sugeridas automaticamente
- 📁 Importação rápida de extratos PDF

### **Para o Sistema:**
- 🧠 Aprende continuamente com o comportamento do usuário
- 📈 Melhora a précisão ao longo do tempo
- 💡 Sugere categorias baseadas em histórico real
- 🔄 Se adapta aos padrões específicos de cada usuário

---

## 📝 Próximas Melhorias Possíveis

- [ ] Suporte para outros bancos (Itaú, Bradesco, Santander, Caixa)
- [ ] Detecção automática do banco pelo PDF
- [ ] Interface para revisar transações antes de importar
- [ ] Confidence score visual nas categorias sugeridas
- [ ] Exportação de regras aprendidas
- [ ] Importação em lote de múltiplos PDFs
- [ ] OCR para PDFs escaneados

---

## 🧪 Testando o Sistema

### **Teste 1: Primeira Importação**
1. Importe um PDF do Nubank
2. Observe as categorias sugeridas automaticamente
3. As transações serão salvas com as categorias

### **Teste 2: Aprendizado**
1. Importe outro PDF com transações similares
2. Note que o sistema sugere categorias mais precisas
3. Padrões repetidos terão maior confiança

### **Teste 3: Verificar Aprendizado**
Execute no SQL Editor do Supabase:
```sql
-- Ver regras aprendidas
SELECT descricao_pattern, confianca, nome as categoria
FROM learning_rules
JOIN categories ON learning_rules.categoria_id = categories.id
WHERE learning_rules.user_id = 'SEU_USER_ID'
ORDER BY confianca DESC
LIMIT 10;
```

---

## ⚠️ Notas Importantes

1. ** Bibliotecas:** Instalada `pdf-parse` para processar PDFs
2. **Desempenho:** PDFs grandes podem levar alguns segundos
3. **Formato:** Otimizado para extratos do Nubank
4. **Privacidade:** Todos os dados ficam no seu banco Supabase

---

## 🎉 Pronto!

O sistema está configurado e funcionando. Faça upload do seu PDF do Nubank e veja a mágica acontecer! 🚀
