#!/usr/bin/env groovy

import jenkins.model.*
import hudson.security.*

def instance = Jenkins.getInstance()

// Criar usuário admin se não existir
def hudsonRealm = new HudsonPrivateSecurityRealm(false)
hudsonRealm.createAccount("admin", "admin123")
instance.setSecurityRealm(hudsonRealm)

// Configurar autorização
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)

// Salvar configuração
instance.save()

println "✅ Usuário admin criado com sucesso!"
println "👤 Usuário: admin"
println "🔑 Senha: admin123"
println "🌐 Acesse: http://localhost:8081"
