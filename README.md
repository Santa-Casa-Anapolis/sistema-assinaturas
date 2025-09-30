# Sistema de Assinaturas Digitais para Notas Fiscais

Sistema completo de fluxo de assinaturas digitais para notas fiscais com integração GOV.BR, desenvolvido em React e Node.js.

## 🚀 Funcionalidades

### ✅ Fluxo de Assinaturas
- **Upload de documentos** (PDF, DOCX)
- **Definição do fluxo sequencial** de assinaturas
- **Notificações automáticas** por e-mail
- **Assinatura digital** via GOV.BR (simulada)
- **Registro e auditoria** completa
- **Armazenamento seguro** de documentos

### 🔄 Processo de Assinatura
1. **Fornecedor** envia nota fiscal
2. **Supervisor** assina via GOV.BR
3. **Contabilidade** recebe e processa
4. **Financeiro** revisa e aprova
5. **Diretoria** assina final

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** com Express
- **PostgreSQL** para banco de dados
- **JWT** para autenticação
- **Multer** para upload de arquivos
- **Nodemailer** para notificações
- **Helmet** para segurança

### Frontend
- **React 18** com Hooks
- **React Router** para navegação
- **Tailwind CSS** para estilização
- **Axios** para requisições HTTP
- **React Dropzone** para upload
- **React Toastify** para notificações
- **Lucide React** para ícones

## 📋 Pré-requisitos

- Node.js 16+ 
- Docker (recomendado) ou PostgreSQL 12+
- npm ou yarn
- Git

## 🚀 Instalação e Configuração

### Opção 1: Com Docker (Recomendada)

#### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd nota-fiscais
```

#### 2. Instale as dependências
```bash
npm run install-all
```

#### 3. Inicie o PostgreSQL com Docker
```bash
# Windows
.\docker-start.bat

# Linux/Mac
./docker-start.sh
```

#### 4. Execute o projeto
```bash
npm run dev
```

### Opção 2: PostgreSQL Local

#### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd nota-fiscais
```

#### 2. Instale as dependências
```bash
npm run install-all
```

#### 3. Configure o PostgreSQL local
- Instale PostgreSQL 12+
- Crie o banco `nota_fiscais`
- Configure o arquivo `.env` na pasta `server`

#### 4. Execute o projeto
```bash
npm run dev
```

### Configuração do .env
Crie um arquivo `.env` na pasta `server`:

```env
# Configurações do servidor
PORT=5000
JWT_SECRET=sua-chave-secreta-aqui

# Configurações do PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nota_fiscais
DB_USER=postgres
DB_PASSWORD=postgres

# Configurações de e-mail (opcional)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-app-gmail
```

O sistema estará disponível em:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

## 👥 Usuários de Teste

O sistema vem com usuários pré-configurados:

| Papel | E-mail | Senha |
|-------|--------|-------|
| Fornecedor | fornecedor@empresa.com | 123456 |
| Supervisor Setor A | supervisor.setora@empresa.com | 123456 |
| Supervisor Setor B | supervisor.setorb@empresa.com | 123456 |
| Contabilidade | contabilidade@empresa.com | 123456 |
| Financeiro | financeiro@empresa.com | 123456 |
| Diretoria | diretoria@empresa.com | 123456 |

## 📁 Estrutura do Projeto

```
nota-fiscais/
├── server/                 # Backend Node.js
│   ├── index.js           # Servidor principal
│   ├── package.json       # Dependências do servidor
│   └── uploads/           # Pasta de uploads
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── contexts/      # Contextos (Auth)
│   │   ├── App.js         # Componente principal
│   │   └── index.js       # Ponto de entrada
│   ├── public/            # Arquivos públicos
│   └── package.json       # Dependências do cliente
├── package.json           # Scripts principais
└── README.md             # Documentação
```

## 🔧 Scripts Disponíveis

### Na pasta raiz:
```bash
npm run dev          # Executa servidor e cliente
npm run server       # Executa apenas o servidor
npm run client       # Executa apenas o cliente
npm run build        # Build de produção
npm run install-all  # Instala todas as dependências
```

### No servidor:
```bash
npm start            # Executa em produção
npm run dev          # Executa em desenvolvimento
```

### No cliente:
```bash
npm start            # Executa em desenvolvimento
npm run build        # Build de produção
```

## 🔐 Segurança

- **Autenticação JWT** com expiração
- **Rate limiting** para prevenir ataques
- **Helmet** para headers de segurança
- **Validação de arquivos** (PDF/DOCX apenas)
- **Logs de auditoria** completos
- **Criptografia** de senhas

## 📊 Banco de Dados

O sistema usa PostgreSQL com as seguintes tabelas:

- **users**: Usuários do sistema
- **documents**: Documentos enviados
- **signature_flow**: Fluxo de assinaturas
- **audit_log**: Logs de auditoria

Para configuração detalhada, consulte:
- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Configuração com Docker (recomendado)
- [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) - Configuração PostgreSQL local

## 📧 Notificações por E-mail

### Modo de Desenvolvimento (Padrão)
Por padrão, o sistema está configurado para **modo sem email**. As notificações aparecem apenas no console do servidor.

### Modo com Email (Para produção)
Para ativar as notificações por email:

1. Configure as variáveis `EMAIL_USER` e `EMAIL_PASS` no `.env`
2. Use uma senha de aplicativo do Gmail
3. As notificações são enviadas automaticamente

## 🔄 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário

### Documentos
- `POST /api/documents/upload` - Upload de documento
- `GET /api/documents/pending` - Documentos pendentes
- `GET /api/documents/my-documents` - Meus documentos
- `POST /api/documents/:id/sign` - Assinar documento
- `GET /api/documents/:id/download` - Download de documento

### Usuários
- `GET /api/users/by-role/:role` - Usuários por papel

### Auditoria
- `GET /api/audit/:documentId` - Logs de auditoria

## 🎨 Interface do Usuário

### Dashboard
- Visão geral com estatísticas
- Ações rápidas
- Documentos recentes

### Upload de Documentos
- Drag & drop de arquivos
- Seleção de signatários
- Definição da ordem sequencial

### Assinatura
- Interface de assinatura GOV.BR
- Download do documento
- Validação de assinatura

### Auditoria
- Histórico completo de ações
- Timestamps e IPs
- Rastreabilidade total

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
# Build do cliente
cd client && npm run build

# Executar servidor
cd ../server && npm start
```

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para dúvidas ou suporte, entre em contato através dos issues do GitHub.

---

**Desenvolvido com ❤️ para otimizar o fluxo de assinaturas de notas fiscais**
