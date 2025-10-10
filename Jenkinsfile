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
        
        stage('🐳 Build Docker Images') {
            steps {
                echo '🐳 Fazendo build das imagens Docker...'
                sh '''
                    echo "🏗️ Build do Backend..."
                    docker build -t santacasa/sistema-assinaturas-backend:latest ./server
                    
                    echo "🏗️ Build do Frontend..."
                    docker build -t santacasa/sistema-assinaturas-frontend:latest ./client
                    
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
