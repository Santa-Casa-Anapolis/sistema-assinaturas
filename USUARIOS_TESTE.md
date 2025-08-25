# 👥 Usuários para Teste do Sistema

## 🔐 Credenciais de Acesso

### **Administrador**
- **Usuário**: `karla.souza`
- **Senha**: `123456`
- **Email**: `karla.souza@empresa.com`
- **Função**: Administrador do sistema

### **Fornecedor**
- **Usuário**: `fornecedor`
- **Senha**: `123456`
- **Email**: `fornecedor@empresa.com`
- **Função**: Pode enviar documentos para assinatura

### **Supervisores (por Setor)**

#### **Tecnologia da Informação**
- **Usuário**: `supervisor.ti`
- **Senha**: `123456`
- **Email**: `supervisor.ti@empresa.com`
- **Setor**: SETOR TECNOLOGIA DA INFORMAÇÃO

#### **Contabilidade**
- **Usuário**: `supervisor.contabilidade`
- **Senha**: `123456`
- **Email**: `supervisor.contabilidade@empresa.com`
- **Setor**: SETOR CONTABILIDADE

#### **Centro de Imagem**
- **Usuário**: `supervisor.imagem`
- **Senha**: `123456`
- **Email**: `supervisor.imagem@empresa.com`
- **Setor**: SETOR CENTRO DE IMAGEM

#### **Centro Médico**
- **Usuário**: `supervisor.medico`
- **Senha**: `123456`
- **Email**: `supervisor.medico@empresa.com`
- **Setor**: SETOR CENTRO MEDICO

### **Departamentos**

#### **Contabilidade**
- **Usuário**: `contabilidade`
- **Senha**: `123456`
- **Email**: `contabilidade@empresa.com`
- **Função**: Assina documentos após supervisores

#### **Financeiro**
- **Usuário**: `financeiro`
- **Senha**: `123456`
- **Email**: `financeiro@empresa.com`
- **Função**: Assina documentos após contabilidade

#### **Diretoria**
- **Usuário**: `diretoria`
- **Senha**: `123456`
- **Email**: `diretoria@empresa.com`
- **Função**: Assinatura final dos documentos

## 🔄 Fluxo de Assinatura

1. **Fornecedor** → Envia documento
2. **Supervisor** → Assina primeiro
3. **Contabilidade** → Assina segundo
4. **Financeiro** → Assina terceiro
5. **Diretoria** → Assinatura final

## 📝 Como Testar

1. Acesse: `http://localhost:3001`
2. Use qualquer usuário da lista acima
3. Faça login com **usuário** (nome.sobrenome) e senha
4. Teste o fluxo completo de assinaturas

## ⚠️ Observações

- Todos os usuários usam senha padrão: `123456`
- **Login**: Use o campo `usuário` (formato: `nome.sobrenome`)
- **Email**: Mantido no banco para notificações e identificação
- Documentos são movidos automaticamente para pasta de rede após conclusão
- Sistema funciona em modo sem email (notificações no console)

## 🆕 Novos Supervisores

Quando criar novos supervisores via admin:
- **Nome**: Nome completo (ex: "João Silva")
- **Email**: Email real (ex: "joao.silva@empresa.com")
- **Username**: Gerado automaticamente (ex: "joão.silva")
- **Setor**: Selecionado no dropdown
