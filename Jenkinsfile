pipeline {
  agent any

  parameters {
    string(name: 'BACKEND_PORT', defaultValue: '4000', description: 'Porta externa para mapear o backend')
    string(name: 'FRONTEND_PORT', defaultValue: '5000', description: 'Porta externa para mapear o frontend')
    string(name: 'REACT_APP_API_URL', defaultValue: 'http://172.16.0.219:4000', description: 'URL da API a ser injetada no build do frontend')
    booleanParam(name: 'DEPLOY', defaultValue: true, description: 'Executar docker-compose up -d após build')
    booleanParam(name: 'PUSH_IMAGES', defaultValue: false, description: 'Fazer push das imagens para o registry')
    string(name: 'REGISTRY', defaultValue: 'docker.io', description: 'Registro Docker (ex: docker.io)')
    string(name: 'CREDENTIALS_ID', defaultValue: '', description: 'ID das credenciais no Jenkins para login no registry (username/password)')
  }

  environment {
    BACKEND_IMAGE = 'santacasa/sistema-assinaturas-backend:latest'
    FRONTEND_IMAGE = 'santacasa/sistema-assinaturas-frontend:latest'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Verificar ferramentas') {
      steps {
        script {
          if (isUnix()) {
            sh 'docker --version || true'
            sh 'docker compose version || docker-compose --version || true'
          } else {
            bat 'docker --version'
            bat 'docker compose version || docker-compose --version'
          }
        }
      }
    }

    stage('Build de Imagens') {
      steps {
        script {
          def envs = [
            "BACKEND_PORT=${params.BACKEND_PORT}",
            "FRONTEND_PORT=${params.FRONTEND_PORT}",
            "REACT_APP_API_URL=${params.REACT_APP_API_URL}"
          ]
          withEnv(envs) {
            if (isUnix()) {
              sh "docker compose build || docker-compose build"
            } else {
              bat "docker compose build || docker-compose build"
            }
          }
        }
      }
    }

    stage('Push de Imagens (opcional)') {
      when {
        expression { return params.PUSH_IMAGES && params.CREDENTIALS_ID?.trim() }
      }
      steps {
        script {
          if (isUnix()) {
            withCredentials([usernamePassword(credentialsId: params.CREDENTIALS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
              sh "echo \"$REG_PASS\" | docker login ${params.REGISTRY} -u \"$REG_USER\" --password-stdin"
              sh "docker push ${env.BACKEND_IMAGE}"
              sh "docker push ${env.FRONTEND_IMAGE}"
              sh "docker logout ${params.REGISTRY} || true"
            }
          } else {
            withCredentials([usernamePassword(credentialsId: params.CREDENTIALS_ID, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
              bat "echo %REG_PASS% | docker login ${params.REGISTRY} -u %REG_USER% --password-stdin"
              bat "docker push ${env.BACKEND_IMAGE}"
              bat "docker push ${env.FRONTEND_IMAGE}"
              bat "docker logout ${params.REGISTRY} || exit /b 0"
            }
          }
        }
      }
    }

    stage('Deploy (docker-compose)') {
      when {
        expression { return params.DEPLOY }
      }
      steps {
        script {
          def envs = [
            "BACKEND_PORT=${params.BACKEND_PORT}",
            "FRONTEND_PORT=${params.FRONTEND_PORT}",
            "REACT_APP_API_URL=${params.REACT_APP_API_URL}"
          ]
          withEnv(envs) {
            if (isUnix()) {
              sh "docker compose down || docker-compose down || true"
              sh "docker compose up -d || docker-compose up -d"
              sh "docker compose ps || docker-compose ps"
            } else {
              bat "docker compose down || docker-compose down"
              bat "docker compose up -d || docker-compose up -d"
              bat "docker compose ps || docker-compose ps"
            }
          }
        }
      }
    }
  }

  post {
    success {
      echo 'Deploy realizado com sucesso.'
    }
    failure {
      echo 'Falha no pipeline. Verifique os logs.'
    }
    always {
      script {
        if (isUnix()) {
          sh 'docker ps -a || true'
          sh 'docker images | head -n 20 || true'
        } else {
          bat 'docker ps -a'
          bat 'docker images'
        }
      }
    }
  }
}