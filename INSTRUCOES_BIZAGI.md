# 📋 Instruções para Usar o Diagrama BPMN no Bizagi

## 🎯 **Arquivo Criado:**
- **Nome**: `FLUXO_ASSINATURAS_BIZAGI.bpmn`
- **Formato**: BPMN 2.0 compatível com Bizagi Studio
- **Conteúdo**: Fluxo completo de assinaturas de notas fiscais

## 🚀 **Como Abrir no Bizagi Studio:**

### **Opção 1: Importar Arquivo**
1. **Abra o Bizagi Studio**
2. **Clique em**: `File` → `Import` → `BPMN 2.0`
3. **Selecione**: `FLUXO_ASSINATURAS_BIZAGI.bpmn`
4. **Clique em**: `Open`

### **Opção 2: Arrastar e Soltar**
1. **Abra o Bizagi Studio**
2. **Arraste** o arquivo `FLUXO_ASSINATURAS_BIZAGI.bpmn` para a janela do Bizagi
3. **Confirme** a importação

### **Opção 3: Duplo Clique**
1. **Navegue** até a pasta onde está o arquivo
2. **Dê duplo clique** no arquivo `FLUXO_ASSINATURAS_BIZAGI.bpmn`
3. **O Bizagi** abrirá automaticamente

## 📊 **Elementos do Diagrama:**

### **Eventos:**
- 🟢 **Start Event**: "Fornecedor Envia Nota Fiscal"
- 🔴 **End Events**: Processo concluído ou rejeitado

### **Tarefas de Usuário:**
- 👤 **Upload do Documento**: Fornecedor faz upload
- 👤 **Supervisor Analisa e Assina**: Via GOV.BR
- 👤 **Contabilidade Analisa e Assina**: Departamento contábil
- 👤 **Financeiro Analisa e Assina**: Departamento financeiro
- 👤 **Diretoria Assina Final**: Assinatura final via GOV.BR

### **Tarefas de Sistema:**
- ⚙️ **Mover para Pasta de Rede**: Organização automática
- ⚙️ **Registrar Auditoria**: Log de todas as ações

### **Gateways (Decisões):**
- ❓ **Documento Válido?**: Validação inicial
- ❓ **Supervisor Aprovou?**: Decisão do supervisor
- ❓ **Contabilidade Aprovou?**: Decisão da contabilidade
- ❓ **Financeiro Aprovou?**: Decisão do financeiro
- ❓ **Diretoria Aprovou?**: Decisão final

## 🔄 **Fluxo Principal:**

```
Fornecedor → Upload → Validação → Supervisor → Contabilidade → Financeiro → Diretoria → Sistema → Conclusão
```

## ❌ **Fluxos de Rejeição:**

### **Rejeições por Setor:**
- **Supervisor Rejeita**: Com justificativa
- **Contabilidade Rejeita**: Com justificativa
- **Financeiro Rejeita**: Com justificativa
- **Diretoria Rejeita**: Com justificativa

### **Notificações:**
- 📧 **Notificar Rejeição**: Para o fornecedor
- 📝 **Registrar Justificativa**: No sistema

## 🛠️ **Personalizações no Bizagi:**

### **Adicionar Formulários:**
1. **Clique** em cada tarefa de usuário
2. **Vá em**: `Forms` → `Create Form`
3. **Adicione** campos necessários

### **Configurar Atribuições:**
1. **Selecione** uma tarefa
2. **Vá em**: `Assignment` → `Users`
3. **Defina** quem pode executar

### **Adicionar Regras de Negócio:**
1. **Clique** em um gateway
2. **Vá em**: `Business Rules`
3. **Configure** as condições

### **Configurar Notificações:**
1. **Selecione** uma tarefa
2. **Vá em**: `Notifications`
3. **Configure** emails/SMS

## 📋 **Campos Sugeridos para Formulários:**

### **Upload do Documento:**
- Título do documento
- Descrição
- Arquivo (PDF/DOCX)
- Setor responsável

### **Análise e Assinatura:**
- Comentários da análise
- Decisão (Aprovar/Rejeitar)
- Justificativa (se rejeitar)
- Assinatura GOV.BR

### **Notificação de Rejeição:**
- Motivo da rejeição
- Observações
- Próximos passos

## 🎨 **Personalização Visual:**

### **Cores Sugeridas:**
- 🟢 **Verde**: Tarefas aprovadas
- 🔴 **Vermelho**: Rejeições
- 🟡 **Amarelo**: Em análise
- 🔵 **Azul**: Tarefas de sistema

### **Ícones:**
- 📤 **Upload**: Para upload de documentos
- ✍️ **Assinatura**: Para tarefas de assinatura
- 📁 **Sistema**: Para tarefas automáticas
- ❌ **Rejeição**: Para fluxos de rejeição

## 📈 **Próximos Passos:**

1. **Importe** o arquivo no Bizagi
2. **Revise** o fluxo
3. **Personalize** formulários e regras
4. **Configure** usuários e permissões
5. **Teste** o processo
6. **Publique** para produção

## 🔧 **Suporte:**

Se houver problemas com a importação:
- Verifique se o Bizagi Studio está atualizado
- Confirme que o arquivo não está corrompido
- Tente importar em um novo projeto

---

**✅ Arquivo pronto para uso no Bizagi Studio!**
