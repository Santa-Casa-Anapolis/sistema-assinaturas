# 🔒 Sistema de Backup - Notas Fiscais

## 📋 Visão Geral

Este sistema de backup protege todos os dados críticos do sistema de assinaturas digitais, incluindo:
- **Banco de dados PostgreSQL** (usuários, documentos, assinaturas)
- **Arquivos de assinatura** (PNG dos usuários)
- **Documentos PDF** (notas fiscais)
- **Código fonte** (configurações e scripts)

## 🛠️ Scripts Disponíveis

### 1. `backup-system.bat` - Backup Completo
**Uso:** Backup manual completo do sistema
```bash
backup-system.bat
```
**Inclui:**
- ✅ Banco de dados completo
- ✅ Todas as assinaturas
- ✅ Todos os documentos
- ✅ Código fonte
- ✅ Configurações
- ✅ Instruções de restauração

### 2. `backup-signatures.bat` - Backup das Assinaturas
**Uso:** Backup específico das assinaturas digitais
```bash
backup-signatures.bat
```
**Inclui:**
- ✅ Arquivos PNG das assinaturas
- ✅ Dados do banco (tabela user_signatures)
- ✅ Relatório detalhado
- ✅ Instruções de restauração

### 3. `restore-backup.bat` - Restauração
**Uso:** Restaurar sistema de um backup
```bash
restore-backup.bat
```
**Funcionalidades:**
- ✅ Lista backups disponíveis
- ✅ Confirmação de segurança
- ✅ Restauração completa
- ✅ Verificação de integridade

### 4. `backup-automatico.bat` - Backup Automático
**Uso:** Para agendador de tarefas (backup diário)
```bash
backup-automatico.bat
```
**Funcionalidades:**
- ✅ Backup diário automático
- ✅ Limpeza de backups antigos (7 dias)
- ✅ Log de execução
- ✅ Otimizado para execução silenciosa

## 📁 Estrutura dos Backups

```
backups/
├── backup_2025-09-23_15-30-45/          # Backup completo
│   ├── database_backup.sql              # Banco PostgreSQL
│   ├── signatures/                      # Arquivos de assinatura
│   ├── documents/                       # Documentos PDF
│   ├── source/                          # Código fonte
│   ├── config/                          # Configurações
│   └── backup_info.txt                  # Informações do backup
│
├── signatures_2025-09-23_15-30-45/      # Backup de assinaturas
│   ├── files/                           # Arquivos PNG
│   ├── signatures_data.csv              # Dados do banco
│   └── relatorio_assinaturas.txt        # Relatório
│
└── auto_2025-09-23/                     # Backup automático
    ├── database_backup.sql
    ├── signatures/
    └── documents/
```

## ⚙️ Configuração do Backup Automático

### Windows - Agendador de Tarefas

1. **Abrir Agendador de Tarefas**
   - Windows + R → `taskschd.msc`

2. **Criar Tarefa Básica**
   - Nome: "Backup Sistema Notas Fiscais"
   - Descrição: "Backup automático diário do sistema"

3. **Configurar Disparador**
   - Diariamente às 02:00 (horário de baixo uso)

4. **Configurar Ação**
   - Programa: `C:\Nota Fiscais\Nota Fiscais\backup-automatico.bat`
   - Iniciar em: `C:\Nota Fiscais\Nota Fiscais`

5. **Configurações Avançadas**
   - ✅ Executar mesmo se o usuário não estiver conectado
   - ✅ Executar com privilégios mais altos
   - ✅ Configurar para Windows 10

## 🔐 Segurança dos Backups

### Recomendações Críticas:

1. **Localização Segura**
   - ✅ Manter backups em local físico diferente
   - ✅ Usar armazenamento em nuvem criptografado
   - ✅ Fazer backup em mídia externa (HD, pendrive)

2. **Criptografia**
   - ✅ Criptografar backups sensíveis
   - ✅ Usar senhas fortes para arquivos
   - ✅ Manter chaves de criptografia seguras

3. **Teste de Restauração**
   - ✅ Testar restauração mensalmente
   - ✅ Verificar integridade dos dados
   - ✅ Documentar procedimentos

4. **Retenção**
   - ✅ Manter backups diários por 7 dias
   - ✅ Manter backups semanais por 1 mês
   - ✅ Manter backups mensais por 1 ano

## 🚨 Procedimentos de Emergência

### Em caso de perda de dados:

1. **Parar o sistema**
   ```bash
   taskkill /f /im node.exe
   ```

2. **Identificar o backup mais recente**
   ```bash
   dir backups\ /od
   ```

3. **Restaurar o sistema**
   ```bash
   restore-backup.bat
   ```

4. **Verificar integridade**
   - Testar login de usuários
   - Verificar assinaturas
   - Testar upload de documentos

## 📊 Monitoramento

### Logs de Backup:
- **Arquivo:** `backup_log.txt`
- **Conteúdo:** Data, hora, status de cada backup
- **Localização:** Raiz do projeto

### Verificação de Integridade:
```bash
# Verificar tamanho dos backups
dir backups\ /s

# Verificar logs de erro
findstr "ERRO" backup_log.txt

# Contar arquivos de assinatura
dir backups\*\signatures\ /s /b | find /c ".png"
```

## 🔧 Manutenção

### Limpeza Automática:
- Backups automáticos são limpos após 7 dias
- Backups manuais devem ser limpos manualmente

### Verificação Mensal:
1. Testar restauração de um backup
2. Verificar integridade dos dados
3. Atualizar documentação se necessário
4. Verificar espaço em disco

## 📞 Suporte

Em caso de problemas com backups:
1. Verificar logs em `backup_log.txt`
2. Testar conectividade com PostgreSQL
3. Verificar permissões de arquivo
4. Consultar documentação do PostgreSQL

---

**⚠️ IMPORTANTE:** As assinaturas digitais são dados críticos e irreversíveis. Mantenha sempre múltiplos backups em locais seguros!







