#!/bin/bash

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
echo "📋 4. Verificando permissões do usuário Jenkins:"
groups jenkins || echo "❌ Usuário jenkins não encontrado"

echo ""
echo "📋 5. Verificando se Jenkins está no grupo docker:"
id jenkins || echo "❌ Usuário jenkins não encontrado"

echo ""
echo "📋 6. Verificando caminhos alternativos do Docker:"
ls -la /usr/bin/docker || echo "❌ /usr/bin/docker não existe"
ls -la /usr/local/bin/docker || echo "❌ /usr/local/bin/docker não existe"
ls -la /snap/bin/docker || echo "❌ /snap/bin/docker não existe"

echo ""
echo "📋 7. Verificando status do serviço Docker:"
systemctl status docker || echo "❌ systemctl não disponível"

echo ""
echo "📋 8. Verificando variáveis de ambiente:"
echo "PATH: $PATH"
echo "DOCKER_HOST: $DOCKER_HOST"

echo ""
echo "📋 9. Verificando processos Docker:"
ps aux | grep docker || echo "❌ Nenhum processo Docker encontrado"

echo ""
echo "📋 10. Verificando logs do Docker:"
journalctl -u docker --no-pager -n 20 || echo "❌ journalctl não disponível"

echo ""
echo "✅ Diagnóstico concluído!"
