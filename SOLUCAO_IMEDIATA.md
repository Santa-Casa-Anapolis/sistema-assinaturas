# 🚨 SOLUÇÃO IMEDIATA - Executar no Servidor

## Passo 1: Conectar ao Servidor

Conecte-se ao servidor **172.16.0.219** via RDP ou SSH.

## Passo 2: Remover Stack Completamente

Execute os seguintes comandos no servidor:

```bash
# 1. Remover o stack antigo
docker stack rm sistema-assinaturas

# 2. Aguardar 60 segundos (IMPORTANTE!)
sleep 60

# 3. Verificar se foi removido
docker service ls | grep sistema-assinaturas
# Não deve mostrar nada!

# 4. Verificar networks
docker network ls | grep sistema-assinaturas
```

## Passo 3: Limpar Recursos Órfãos

```bash
# Remover containers parados
docker container prune -f

# Remover networks não utilizadas
docker network prune -f

# Verificar portas
netstat -tulpn | grep -E ':(3000|5000)'
# Não deve mostrar nada nas portas 3000 e 5000
```

## Passo 4: Ir para Pasta do Projeto

```bash
cd /caminho/do/projeto/sistema-assinaturas
# OU
cd "C:\Nota Fiscais\Nota Fiscais"
```

## Passo 5: Fazer Pull das Atualizações

```bash
git pull origin master
```

## Passo 6: Deploy Manual

```bash
# Deploy do stack com as portas corretas
docker stack deploy -c docker-compose.yml sistema-assinaturas

# Verificar serviços
docker service ls

# Ver logs do backend
docker service logs -f sistema-assinaturas_backend
```

## Passo 7: Testar

Acesse: **http://172.16.0.219:5000**

---

## ⚠️ Se Ainda Assim Não Funcionar

Execute este comando BRUTAL (remove TUDO):

```bash
# CUIDADO: Isso remove TODOS os stacks!
docker stack rm sistema-assinaturas
sleep 60
docker system prune -a -f --volumes

# Depois faça o deploy novamente
docker stack deploy -c docker-compose.yml sistema-assinaturas
```

---

## 📝 Comandos Úteis

```bash
# Ver todos os serviços
docker service ls

# Ver logs de um serviço específico
docker service logs -f sistema-assinaturas_backend
docker service logs -f sistema-assinaturas_frontend

# Ver detalhes de um serviço
docker service inspect sistema-assinaturas_backend

# Escalar serviço (aumentar replicas)
docker service scale sistema-assinaturas_backend=2
```

