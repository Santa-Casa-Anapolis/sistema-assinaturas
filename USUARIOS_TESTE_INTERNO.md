# Usuários de Teste - Sistema de Assinaturas

## ⚠️ INFORMAÇÕES INTERNAS - NÃO EXIBIR NO FRONTEND

### Usuários Disponíveis para Teste:

| Role | Usuário | Senha | Descrição |
|------|---------|-------|-----------|
| **Admin Principal** | `admin@santacasa.org` | `123456` | Acesso total à administração |
| **Admin** | `karla.souza@santacasa.org` | `123456` | Admin sem acesso à administração |
| **Admin** | `diretoria.teste@santacasa.org` | `123456` | Admin sem acesso à administração |
| **Supervisor** | `supervisor.teste@santacasa.org` | `123456` | Supervisor de setor |
| **Contabilidade** | `contabilidade.teste@santacasa.org` | `123456` | Área contábil |
| **Financeiro** | `financeiro.teste@santacasa.org` | `123456` | Área financeira |

### Permissões:

- **Apenas `admin@santacasa.org`** pode gerenciar usuários
- **Outros admins** têm acesso limitado
- **Supervisores** podem criar documentos
- **Contabilidade/Financeiro** podem aprovar documentos

### Notas de Segurança:

- Estas credenciais são apenas para ambiente de desenvolvimento
- Em produção, usar autenticação via Active Directory
- Senhas padrão devem ser alteradas em produção

---
*Documento interno - não compartilhar com usuários finais*
