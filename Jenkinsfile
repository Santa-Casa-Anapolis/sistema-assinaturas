pipeline {
    agent any
    
    environment {
        CI = 'true'
    }
    
    stages {
        stage('🔄 Checkout') {
            steps {
                echo '📥 Fazendo checkout do código...'
                cleanWs()
                git branch: 'master', url: 'https://github.com/Santa-Casa-Anapolis/sistema-assinaturas.git'
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.GIT_BRANCH = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                }
                echo "🌿 Branch: ${env.GIT_BRANCH}"
                echo "📝 Commit: ${env.GIT_COMMIT_SHORT}"
            }
        }
        
        stage('🔍 Diagnóstico Docker') {
            steps {
                echo '🔍 Executando diagnóstico do Docker...'
                sh '''
                    echo "🔍 DIAGNÓSTICO DO DOCKER NO JENKINS"
                    echo "=================================="
                    
                    echo ""
                    echo "📋 1. Verificando se Docker está instalado:"
                    which docker || echo "❌ Docker não encontrado no PATH"
                    
                    echo ""
                    echo "📋 2. Verificando versão do Docker:"
                    docker --version || echo "❌ Docker não está funcionando"
                    
                    echo ""
                    echo "📋 3. Verificando se Docker está rodando:"
                    docker info || echo "❌ Docker daemon não está rodando"
                    
                    echo ""
                    echo "📋 4. Verificando permissões do usuário:"
                    whoami
                    groups
                    
                    echo ""
                    echo "📋 5. Verificando caminhos alternativos do Docker:"
                    ls -la /usr/bin/docker || echo "❌ /usr/bin/docker não existe"
                    ls -la /usr/local/bin/docker || echo "❌ /usr/local/bin/docker não existe"
                    ls -la /snap/bin/docker || echo "❌ /snap/bin/docker não existe"
                    
                    echo ""
                    echo "📋 6. Verificando variáveis de ambiente:"
                    echo "PATH: $PATH"
                    echo "DOCKER_HOST: $DOCKER_HOST"
                    
                    echo ""
                    echo "📋 7. Verificando processos Docker:"
                    ps aux | grep docker || echo "❌ Nenhum processo Docker encontrado"
                    
                    echo ""
                    echo "✅ Diagnóstico concluído!"
                '''
            }
        }
        
        stage('📥 Pré-pull de Imagens Docker') {
            steps {
                echo '📥 Fazendo pull das imagens base necessárias...'
                sh '''
                    echo "📥 Fazendo pull das imagens base para evitar problemas de registry..."
                    
                    echo "📥 Pull da imagem node:18-slim..."
                    docker pull node:18-slim || echo "⚠️ Falha ao fazer pull do node:18-slim"
                    
                    echo "📥 Pull da imagem node:18..."
                    docker pull node:18 || echo "⚠️ Falha ao fazer pull do node:18"
                    
                    echo "📥 Pull da imagem nginx:alpine..."
                    docker pull nginx:alpine || echo "⚠️ Falha ao fazer pull do nginx:alpine"
                    
                    echo "📥 Pull da imagem nginx:latest..."
                    docker pull nginx:latest || echo "⚠️ Falha ao fazer pull do nginx:latest"
                    
                    echo "✅ Pré-pull concluído!"
                '''
            }
        }
        
        stage('🐳 Build Docker Images') {
            steps {
                echo '🐳 Fazendo build das imagens Docker...'
                sh '''
                    echo "🏗️ Build do Backend..."
                    docker build -t santacasa/sistema-assinaturas-backend:latest ./server
                    
                    echo "🏗️ Build do Frontend..."
                    # Tentar build com imagem padrão primeiro
                    if ! docker build -t santacasa/sistema-assinaturas-frontend:latest ./client; then
                        echo "⚠️ Build falhou com node:18-slim. Tentando com imagem alternativa..."
                        
                        # Tentar com imagem alternativa
                        if [ -f ./client/Dockerfile.alternative ]; then
                            echo "🔄 Usando Dockerfile alternativo..."
                            docker build -f ./client/Dockerfile.alternative -t santacasa/sistema-assinaturas-frontend:latest ./client
                        else
                            echo "❌ Dockerfile alternativo não encontrado. Tentando pull manual da imagem..."
                            
                            # Tentar fazer pull manual da imagem base
                            echo "📥 Fazendo pull manual da imagem node:18..."
                            docker pull node:18 || echo "⚠️ Pull manual falhou"
                            
                            # Tentar build novamente
                            docker build -t santacasa/sistema-assinaturas-frontend:latest ./client
                        fi
                    fi
                    
                    echo "✅ Imagens Docker criadas com sucesso!"
                    docker images | grep sistema-assinaturas
                '''
            }
        }
        
        stage('🚀 Deploy with Docker Swarm') {
            steps {
                echo '🐳 Fazendo deploy com Docker Swarm...'
                sh '''
                    echo "🗑️ Removendo stack antigo..."
                    docker stack rm sistema-assinaturas || echo "Stack não existe ainda"
                    
                    echo "⏳ Aguardando serviços serem removidos (60 segundos)..."
                    sleep 60
                    
                    echo "🔍 Verificando se todos os serviços foram removidos..."
                    SERVICES=$(docker service ls | grep sistema-assinaturas | wc -l)
                    if [ "$SERVICES" -gt 0 ]; then
                        echo "⚠️ Ainda existem $SERVICES serviços. Aguardando mais 30 segundos..."
                        sleep 30
                    fi
                    
                    echo "🧹 Limpando recursos órfãos..."
                    docker container prune -f
                    docker network prune -f
                    
                    echo "✅ Stack removido com sucesso"
                    docker service ls | grep sistema-assinaturas || echo "✅ Nenhum serviço antigo encontrado"
                    
                    echo "🚀 Fazendo deploy do novo stack..."
                    # Definir variáveis de ambiente para produção
                    export BACKEND_PORT=4000
                    export FRONTEND_PORT=5000
                    export REACT_APP_API_URL=http://172.16.0.219:4000
                    docker stack deploy -c docker-compose.yml sistema-assinaturas
                    
                    echo "📊 Verificando serviços criados..."
                    sleep 10
                    docker service ls | grep sistema-assinaturas
                    
                    echo "✅ Deploy concluído!"
                    echo "📱 Sistema: http://172.16.0.219:5000"
                    echo "🖥️ API:     http://172.16.0.219:4000"
                '''
            }
        }
    }
    
    post {
        success {
            echo '🎉 Pipeline executado com sucesso!'
            echo "✅ Sistema: http://172.16.0.219:5000"
        }
        
        failure {
            echo '❌ Pipeline falhou!'
            echo '❌ Verifique os logs acima para detalhes do erro'
        }
    }
}
