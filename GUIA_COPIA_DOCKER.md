# 🐳 Guia para Copiar Imagens Docker - Sistema de Assinaturas

## 📋 **PASSO A PASSO COMPLETO**

### **1️⃣ EXPORTAR AS IMAGENS DOCKER**

Execute os comandos abaixo no PowerShell (como Administrador):

```powershell
# Navegar para a pasta do projeto
cd "C:\Nota Fiscais\Nota Fiscais"

# Exportar imagem do PostgreSQL
docker save postgres:13 -o postgres-13.tar

# Exportar imagem do pgAdmin
docker save dpage/pgadmin4:latest -o pgadmin4-latest.tar
```

### **2️⃣ COMPRIMIR OS ARQUIVOS**

```powershell
# Criar arquivo ZIP com todas as imagens
Compress-Archive -Path "*.tar" -DestinationPath "docker-images-sistema-assinaturas.zip"
```

### **3️⃣ ENVIAR PARA A OUTRA PESSOA**

- **Arquivo:** `docker-images-sistema-assinaturas.zip`
- **Tamanho aproximado:** ~2GB
- **Métodos de envio:**
  - Google Drive / OneDrive
  - WeTransfer
  - Email (se menor que 25MB por parte)

---

## 🚀 **INSTRUÇÕES PARA QUEM VAI RECEBER**

### **1️⃣ PREPARAR O AMBIENTE**

```powershell
# Instalar Docker Desktop
# Baixar de: https://www.docker.com/products/docker-desktop

# Verificar se Docker está rodando
docker --version
```

### **2️⃣ IMPORTAR AS IMAGENS**

```powershell
# Extrair o arquivo ZIP
# Navegar para a pasta extraída

# Importar cada imagem
docker load -i postgres-13.tar
docker load -i pgadmin4-latest.tar

# Verificar se foram importadas
docker images
```

### **3️⃣ CONFIGURAR O SISTEMA**

```powershell
# Navegar para a pasta do projeto
cd "C:\Nota Fiscais\Nota Fiscais"

# Iniciar os containers
docker-compose up -d

# Verificar status
docker ps
```

### **4️⃣ CONFIGURAR BANCO DE DADOS**

```powershell
# Executar script de inicialização
cd server
node init-db.js
```

---

## 📁 **ARQUIVOS NECESSÁRIOS PARA ENVIAR**

### **Obrigatórios:**
- ✅ `docker-images-sistema-assinaturas.zip` (imagens Docker)
- ✅ Pasta completa do projeto `Nota Fiscais`
- ✅ Este arquivo `GUIA_COPIA_DOCKER.md`

### **Estrutura do Projeto:**
```
Nota Fiscais/
├── client/          (Frontend React)
├── server/          (Backend Node.js)
├── docker-compose.yml
└── README.md
```

---

## ⚠️ **OBSERVAÇÕES IMPORTANTES**

### **Para quem envia:**
- ✅ Verificar se todas as imagens foram exportadas corretamente
- ✅ Testar o arquivo ZIP antes de enviar
- ✅ Incluir este guia no envio

### **Para quem recebe:**
- ✅ Docker Desktop deve estar instalado e rodando
- ✅ Portas 3000, 5000, 8081, 5432 devem estar livres
- ✅ Ter pelo menos 4GB de RAM disponível
- ✅ Executar PowerShell como Administrador

### **Troubleshooting:**
- **Erro de permissão:** Executar como Administrador
- **Porta ocupada:** Verificar `netstat -an | findstr :PORTA`
- **Docker não inicia:** Reiniciar Docker Desktop
- **Imagem corrompida:** Re-exportar a imagem específica

---

## 🎯 **COMANDOS RÁPIDOS DE VERIFICAÇÃO**

```powershell
# Verificar imagens importadas
docker images

# Verificar containers rodando
docker ps

# Verificar logs se houver erro
docker logs [nome-do-container]

# Parar todos os containers
docker-compose down

# Iniciar novamente
docker-compose up -d
```

---

## 📞 **SUPORTE**

Se houver problemas:
1. Verificar logs do Docker Desktop
2. Reiniciar Docker Desktop
3. Verificar se as portas estão livres
4. Executar comandos como Administrador

**Sistema testado e funcionando!** 🚀✨
