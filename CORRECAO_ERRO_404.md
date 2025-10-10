# Correção do Erro 404 do Nginx no AdminPanel

## Problema Identificado

O AdminPanel estava retornando erro 404 ao tentar buscar usuários porque:

1. **Docker Desktop não estava rodando** - os containers não estavam ativos
2. **URL da API incorreta** - estava usando HTTPS e localhost ao invés de HTTP e IP correto
3. **Nginx interno não configurado** - o frontend usa nginx internamente mas não estava na porta correta

## Correções Aplicadas

### 1. docker-compose.yml
- ✅ Corrigido `REACT_APP_API_URL` de `https://172.16.0.219:4000` para `http://172.16.0.219:4000`
- ✅ Corrigido variável de ambiente de runtime de `http://localhost:4000` para `http://172.16.0.219:4000`

### 2. client/Dockerfile
- ✅ Adicionado `ARG REACT_APP_API_URL` para aceitar variável durante o build
- ✅ Configurado nginx interno para escutar na porta 5000
- ✅ Adicionado suporte a SPA (Single Page Application) com `try_files`

### 3. Script de Inicialização
- ✅ Criado `fix-and-start.bat` para iniciar o sistema corretamente

## Como Resolver

### Passo 1: Iniciar Docker Desktop

1. Abra o **Docker Desktop** no Windows
2. Aguarde até que o status apareça como "Running"
3. Verifique o ícone na bandeja do sistema

### Passo 2: Executar Script de Correção

Execute o script criado:

```batch
fix-and-start.bat
```

Ou execute manualmente:

```batch
# Parar containers existentes
docker-compose down

# Remover imagem antiga do frontend
docker rmi santacasa/sistema-assinaturas-frontend:latest

# Reconstruir frontend
docker-compose build --no-cache frontend

# Iniciar todos os serviços
docker-compose up -d
```

### Passo 3: Verificar Containers

```batch
docker ps
```

Você deve ver 3 containers rodando:
- `sistema-assinaturas-frontend` (porta 5000)
- `sistema-assinaturas-backend` (porta 4000)
- `notasfiscais_db` (porta 5432)

### Passo 4: Testar a Aplicação

1. Acesse o frontend: **http://172.16.0.219:5000**
2. Faça login com suas credenciais
3. Acesse o **Painel de Administração**
4. Verifique se a lista de usuários carrega sem erro 404

## Verificação de Logs

Se ainda houver problemas, verifique os logs:

```batch
# Logs do frontend
docker logs sistema-assinaturas-frontend

# Logs do backend
docker logs sistema-assinaturas-backend

# Logs do banco de dados
docker logs notasfiscais_db
```

## URLs de Acesso

- **Frontend**: http://172.16.0.219:5000
- **Backend API**: http://172.16.0.219:4000
- **Banco de Dados**: postgresql://172.16.0.219:5432

## Observações Importantes

1. O **nginx** está rodando DENTRO do container do frontend (não no host)
2. O nginx interno escuta na porta 5000 (não na porta 80)
3. A variável `REACT_APP_API_URL` é definida durante o BUILD do React, não em runtime
4. O CORS está habilitado no backend para aceitar requisições de qualquer origem

## Troubleshooting

### Erro: "Docker Desktop não está rodando"
- Solução: Inicie o Docker Desktop e aguarde ele ficar pronto

### Erro: "Port already in use"
- Solução: Verifique se outro serviço está usando as portas 4000, 5000 ou 5432
- Use: `netstat -ano | findstr ":4000"` para verificar

### Erro: "Cannot connect to backend"
- Verifique se o backend está rodando: `docker logs sistema-assinaturas-backend`
- Verifique se o banco de dados está acessível

### AdminPanel ainda retorna 404
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Tente em uma janela anônima/privada
- Verifique o console do navegador (F12) para ver a URL que está sendo chamada

