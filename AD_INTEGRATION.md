# 🔐 Integração com Active Directory (AD)

Este documento explica como configurar a integração do sistema com o Active Directory para autenticação de usuários.

## 📋 Pré-requisitos

1. **Servidor AD acessível** via LDAP
2. **Service Account** no AD com permissões de leitura
3. **Grupos organizados** no AD para mapear roles do sistema
4. **Dependência ldapjs** instalada no servidor

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
# Configurações do Active Directory
AD_URL=ldap://seu-servidor-ad.com:389
AD_BASE_DN=DC=empresa,DC=com
AD_USERNAME=CN=ServiceAccount,OU=ServiceAccounts,DC=empresa,DC=com
AD_PASSWORD=senha_do_service_account

# Modo de Autenticação (local ou ad)
AUTH_MODE=ad
```

### 2. Configuração Simples

O AD é usado apenas para autenticação. Não é necessário configurar grupos específicos no AD.

### 3. Gerenciamento na Plataforma

Todos os roles e setores são definidos diretamente na plataforma:

- **Roles**: supervisor, contabilidade, financeiro, diretoria, admin
- **Setores**: Definidos livremente pelo administrador
- **Usuários**: Adicionados manualmente através da interface

## 🔄 Fluxo de Autenticação

### Modo Local (Padrão)
1. Usuário insere email e senha
2. Sistema verifica credenciais no banco PostgreSQL
3. Gera token JWT se válido

### Modo AD
1. Usuário insere credenciais do AD
2. Sistema conecta ao AD via LDAP
3. Valida credenciais no AD
4. Verifica se usuário existe no banco local
5. Atualiza nome do usuário (se necessário)
6. Gera token JWT com role/setor definidos na plataforma

## 🛠️ Funcionalidades

### 1. Login com AD
- Usuários fazem login com credenciais do AD
- Sistema valida apenas usuário e senha no AD
- Role e setor são definidos na plataforma pelo admin

### 2. Gerenciamento de Usuários
- Administradores podem buscar usuários do AD
- Interface para adicionar usuários do AD como supervisores
- Definição manual de setores para cada supervisor

### 3. Controle Total na Plataforma
- Todos os roles e setores são definidos na plataforma
- Flexibilidade total para organizar usuários
- Sem dependência de grupos do AD

## 📝 Exemplo de Configuração

### Service Account no AD
```
Nome: ServiceAccount
DN: CN=ServiceAccount,OU=ServiceAccounts,DC=empresa,DC=com
Permissões: Leitura em usuários e grupos
```

### Usuário Exemplo
```
Nome: João Silva
Username: joao.silva
Email: joao.silva@empresa.com
Grupos: CN=Supervisores,CN=Supervisores_TI
Role: supervisor
Setor: SETOR TECNOLOGIA DA INFORMAÇÃO
```

## 🔧 Troubleshooting

### Erro de Conexão LDAP
```
❌ Erro na conexão LDAP: ECONNREFUSED
```
**Solução:** Verificar se o servidor AD está acessível e a porta 389 está aberta.

### Erro de Autenticação
```
❌ Falha na autenticação com o Active Directory
```
**Solução:** Verificar credenciais do Service Account e permissões.

### Usuário não encontrado
```
❌ Usuário não encontrado no AD
```
**Solução:** Verificar se o usuário existe no AD e está no Base DN correto.

## 🔒 Segurança

1. **Service Account**: Use uma conta dedicada com permissões mínimas
2. **Conexão LDAPS**: Configure LDAPS (porta 636) para produção
3. **Timeout**: Configure timeouts adequados para evitar travamentos
4. **Logs**: Monitore logs de autenticação para detectar tentativas de acesso

## 📊 Monitoramento

O sistema registra todas as operações no log de auditoria:
- `LOGIN (ad)`: Login via AD
- `AD_SYNC`: Sincronização de usuários
- `SUPERVISOR_CREATED`: Criação de supervisores

## 🚀 Migração

Para migrar de autenticação local para AD:

1. Configure as variáveis de ambiente do AD
2. Defina `AUTH_MODE=ad`
3. Teste com um usuário do AD
4. Sincronize usuários existentes
5. Desabilite autenticação local se necessário
