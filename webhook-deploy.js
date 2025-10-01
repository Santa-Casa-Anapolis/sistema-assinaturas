#!/usr/bin/env node

/**
 * 🚀 Webhook para Deploy Automático
 * 
 * Este script recebe webhooks do GitHub/GitLab e executa deploy automático
 * 
 * Para usar:
 * 1. npm install express crypto
 * 2. node webhook-deploy.js
 * 3. Configurar webhook no GitHub/GitLab apontando para: http://seu-servidor:3001/webhook
 */

const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3002;  // Porta isolada para não conflitar

// Configurações
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'sua-chave-secreta-webhook';
const DEPLOY_SCRIPT = './deploy-isolado.sh';
const LOG_FILE = './deploy.log';

// Middleware para parsing JSON
app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${req.method} ${req.url} - ${req.ip}\n`;
    fs.appendFileSync(LOG_FILE, logEntry);
    next();
});

// Função para verificar assinatura do webhook
function verifySignature(payload, signature) {
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
    );
}

// Função para executar deploy
function executeDeploy(branch, commit) {
    return new Promise((resolve, reject) => {
        const command = `bash ${DEPLOY_SCRIPT} deploy`;
        
        console.log(`🚀 Executando deploy para branch: ${branch}, commit: ${commit}`);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Erro no deploy: ${error}`);
                reject(error);
                return;
            }
            
            console.log(`✅ Deploy concluído com sucesso!`);
            console.log(`📝 Output: ${stdout}`);
            
            if (stderr) {
                console.warn(`⚠️ Warnings: ${stderr}`);
            }
            
            resolve({ stdout, stderr });
        });
    });
}

// Endpoint principal do webhook
app.post('/webhook', (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'] || req.headers['x-gitlab-token'];
        const payload = JSON.stringify(req.body);
        
        // Verificar assinatura (opcional, mas recomendado)
        if (WEBHOOK_SECRET && signature) {
            if (!verifySignature(payload, signature)) {
                console.error('❌ Assinatura do webhook inválida!');
                return res.status(401).json({ error: 'Assinatura inválida' });
            }
        }
        
        // Extrair informações do payload
        let branch, commit, repository;
        
        // GitHub webhook
        if (req.body.ref) {
            branch = req.body.ref.replace('refs/heads/', '');
            commit = req.body.head_commit?.id || req.body.after;
            repository = req.body.repository?.name;
        }
        // GitLab webhook
        else if (req.body.ref) {
            branch = req.body.ref.replace('refs/heads/', '');
            commit = req.body.after;
            repository = req.body.project?.name;
        }
        // Payload customizado
        else {
            branch = req.body.branch || 'main';
            commit = req.body.commit || 'unknown';
            repository = req.body.repository || 'unknown';
        }
        
        console.log(`📥 Webhook recebido:`);
        console.log(`   Repositório: ${repository}`);
        console.log(`   Branch: ${branch}`);
        console.log(`   Commit: ${commit}`);
        
        // Verificar se é a branch principal
        if (branch !== 'main' && branch !== 'master') {
            console.log(`⏭️ Ignorando push na branch: ${branch}`);
            return res.json({ message: 'Branch ignorada', branch });
        }
        
        // Executar deploy em background
        executeDeploy(branch, commit)
            .then(result => {
                console.log('✅ Deploy executado com sucesso!');
            })
            .catch(error => {
                console.error('❌ Erro no deploy:', error);
            });
        
        // Responder imediatamente
        res.json({ 
            message: 'Deploy iniciado', 
            branch, 
            commit, 
            repository,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Endpoint para status
app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Endpoint para logs
app.get('/logs', (req, res) => {
    try {
        const logs = fs.readFileSync(LOG_FILE, 'utf8');
        res.json({ logs: logs.split('\n').slice(-50) }); // Últimas 50 linhas
    } catch (error) {
        res.json({ logs: [] });
    }
});

// Endpoint para deploy manual
app.post('/deploy', (req, res) => {
    const { branch = 'main' } = req.body;
    
    console.log(`🚀 Deploy manual solicitado para branch: ${branch}`);
    
    executeDeploy(branch, 'manual')
        .then(result => {
            res.json({ 
                message: 'Deploy manual executado com sucesso',
                output: result.stdout
            });
        })
        .catch(error => {
            res.status(500).json({ 
                error: 'Erro no deploy manual',
                details: error.message
            });
        });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Webhook de deploy rodando na porta ${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/webhook`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log(`📝 Logs: http://localhost:${PORT}/logs`);
    console.log(`🔧 Deploy manual: POST http://localhost:${PORT}/deploy`);
    console.log('');
    console.log('🔐 Para configurar no GitHub/GitLab:');
    console.log(`   URL: http://seu-servidor:${PORT}/webhook`);
    console.log(`   Secret: ${WEBHOOK_SECRET}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Parando webhook de deploy...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Parando webhook de deploy...');
    process.exit(0);
});
