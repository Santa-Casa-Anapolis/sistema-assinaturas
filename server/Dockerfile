# Dockerfile para o servidor Node.js
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --only=production

# Copiar código fonte
COPY . .

# Expor porta do servidor
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["npm", "start"]
