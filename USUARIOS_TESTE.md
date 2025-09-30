# 👥 Usuários de Teste - Sistema de Assinaturas

## 🔐 **Login: Usuário + Senha**

O sistema agora usa apenas **username** e **senha** para login, sem necessidade de email.

---

## 📋 **Usuários Padrão do Sistema:**

### **👨‍💼 Administrador:**
- **Usuário**: `karla.souza`
- **Senha**: `123456`
- **Nome**: Karla Souza
- **Função**: Administrador
- **Tipo de Função**: admin
- **Setor/Grupo**: N/A

### **📤 Fornecedor:**
- **Usuário**: `fornecedor`
- **Senha**: `123456`
- **Nome**: Fornecedor
- **Função**: Fornecedor
- **Tipo de Função**: fornecedor
- **Setor/Grupo**: N/A

### **📊 Usuários do Ciclo de Aprovação:**

#### **Contabilidade:**
- **Usuário**: `analista.contabilidade`
- **Senha**: `123456`
- **Nome**: Analista Contabilidade
- **Função**: Contabilidade
- **Tipo de Função**: contabilidade
- **Setor**: N/A
- **Grupo**: GRUPO CONTABILIDADE

#### **Financeiro:**
- **Usuário**: `analista.financeiro`
- **Senha**: `123456`
- **Nome**: Analista Financeiro
- **Função**: Financeiro
- **Tipo de Função**: financeiro
- **Setor**: N/A
- **Grupo**: GRUPO FINANCEIRO

#### **Diretoria:**
- **Usuário**: `diretor.executivo`
- **Senha**: `123456`
- **Nome**: Diretor Executivo
- **Função**: Diretoria
- **Tipo de Função**: diretoria
- **Setor**: N/A
- **Grupo**: GRUPO DIRETORIA

### **🔄 Usuários Antigos (Compatibilidade):**

#### **Contabilidade:**
- **Usuário**: `contabilidade`
- **Senha**: `123456`
- **Nome**: Contabilidade
- **Função**: Contabilidade
- **Tipo de Função**: contabilidade
- **Setor**: N/A
- **Grupo**: GRUPO CONTABILIDADE

#### **Financeiro:**
- **Usuário**: `financeiro`
- **Senha**: `123456`
- **Nome**: Financeiro
- **Função**: Financeiro
- **Tipo de Função**: financeiro
- **Setor**: N/A
- **Grupo**: GRUPO FINANCEIRO

#### **Diretoria:**
- **Usuário**: `diretoria`
- **Senha**: `123456`
- **Nome**: Diretoria
- **Função**: Diretoria
- **Tipo de Função**: diretoria
- **Setor**: N/A
- **Grupo**: GRUPO DIRETORIA

---

## 🎯 **Como Usar:**

1. **Acesse**: http://localhost:3001
2. **Digite** o **usuário** (ex: `karla.souza`)
3. **Digite** a **senha** (ex: `123456`)
4. **Clique** em "Entrar"

---

## 📝 **Observações:**

- ✅ **Login simplificado**: Apenas username e senha
- ✅ **Sem email**: Não é necessário usar email para login
- ✅ **Nome completo**: Mantido separado para exibição
- ✅ **Tipo de Função**: Define a etapa do fluxo (supervisor, contabilidade, financeiro, diretoria)
- ✅ **Setor**: Define pasta de destino (apenas para supervisores)
- ✅ **Grupos**: Organizam departamentos do processo de assinatura

---

## 🔧 **Para Administradores:**

- **Adicionar usuários**: Use o painel administrativo
- **Definir username**: Formato sugerido: `nome.sobrenome`
- **Definir tipo de função**: supervisor, contabilidade, financeiro, diretoria
- **Definir setor**: Para supervisores (define pasta de destino)
- **Definir grupo**: Para departamentos (contabilidade, financeiro, diretoria)

---

## 📁 **Estrutura de Pastas:**

### **Setores (Supervisores):**
- `SETOR TECNOLOGIA DA INFORMAÇÃO/`
- `SETOR CONTABILIDADE/`
- `SETOR CENTRO DE IMAGEM/`
- `SETOR CENTRO MEDICO/`
- `SETOR FATURAMENTO/`
- `SETOR RH/`
- `SETOR COMPRAS/`

### **Grupos (Departamentos):**
- `GRUPO CONTABILIDADE/`
- `GRUPO FINANCEIRO/`
- `GRUPO DIRETORIA/`

---

## 🔄 **Fluxo de Aprovação:**

1. **Fornecedor** → Envia documento
2. **Supervisor** → Aprova e define setor de destino
3. **Contabilidade** → Analisa e assina
4. **Financeiro** → Analisa e assina
5. **Diretoria** → Aprovação final
6. **Arquivo** → Movido para pasta do setor do supervisor

---

## 🏷️ **Tipos de Função:**

- **supervisor**: Inicia processo e define pasta de destino
- **contabilidade**: Analisa e assina documentos
- **financeiro**: Analisa e assina documentos
- **diretoria**: Aprovação final
- **admin**: Administração do sistema
- **fornecedor**: Envia documentos
