# Script PowerShell para configuração de produção no Windows Server
# Execute como Administrador

param(
    [string]$Domain = "sistema-assinaturas.santacasa.org",
    [string]$Email = "admin@santacasa.org",
    [string]$ServerIP = "172.16.0.219"
)

Write-Host "🚀 Configurando Sistema de Assinaturas para Produção..." -ForegroundColor Green
Write-Host ""

# Verificar se está rodando como Administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ Execute este script como Administrador" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Configurações:" -ForegroundColor Cyan
Write-Host "   Domínio: $Domain" -ForegroundColor Yellow
Write-Host "   Email: $Email" -ForegroundColor Yellow
Write-Host "   IP do servidor: $ServerIP" -ForegroundColor Yellow
Write-Host ""

# 1. Instalar IIS e módulos necessários
Write-Host "📦 Configurando IIS..." -ForegroundColor Green

# Habilitar IIS
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent

# Habilitar módulos adicionais
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpRedirect, IIS-Security, IIS-RequestFiltering, IIS-Performance, IIS-WebServerManagementTools, IIS-ManagementConsole

# 2. Configurar SSL
Write-Host "🔐 Configurando SSL..." -ForegroundColor Green

# Criar certificado autoassinado
$cert = New-SelfSignedCertificate -DnsName $Domain -CertStoreLocation "cert:\LocalMachine\My"

# Exportar certificado
$certPath = "C:\inetpub\wwwroot\ssl\$Domain.pfx"
New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\ssl"
$password = ConvertTo-SecureString -String "SistemaAssinaturas2024!" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $certPath -Password $password

Write-Host "✅ Certificado SSL criado: $certPath" -ForegroundColor Green

# 3. Configurar site no IIS
Write-Host "🔧 Configurando site no IIS..." -ForegroundColor Green

# Importar módulo IIS
Import-Module WebAdministration

# Remover site padrão
Remove-Website -Name "Default Web Site" -ErrorAction SilentlyContinue

# Criar site
New-Website -Name "SistemaAssinaturas" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\sistema-assinaturas" -BindingInformation "*:80:$Domain"

# Criar binding HTTPS
New-WebBinding -Name "SistemaAssinaturas" -Protocol https -Port 443 -HostHeader $Domain

# Configurar certificado SSL
$binding = Get-WebBinding -Name "SistemaAssinaturas" -Protocol https
$binding.AddSslCertificate($cert.Thumbprint, "my")

# 4. Configurar redirecionamento HTTP para HTTPS
Write-Host "🔄 Configurando redirecionamento..." -ForegroundColor Green

# Criar regra de redirecionamento
$webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="Redirect to HTTPS" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
                    </conditions>
                    <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" 
                            redirectType="Permanent" />
                </rule>
            </rules>
        </rewrite>
        <security>
            <requestFiltering>
                <requestLimits maxAllowedContentLength="52428800" />
            </requestFiltering>
        </security>
    </system.webServer>
</configuration>
"@

Set-Content -Path "C:\inetpub\wwwroot\sistema-assinaturas\web.config" -Value $webConfig

# 5. Configurar proxy reverso (se necessário)
Write-Host "🔄 Configurando proxy reverso..." -ForegroundColor Green

# Instalar ARR (Application Request Routing)
# Download: https://www.iis.net/downloads/microsoft/application-request-routing

# 6. Configurar firewall
Write-Host "🔥 Configurando firewall..." -ForegroundColor Green

# Permitir tráfego HTTP/HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# 7. Criar diretórios necessários
Write-Host "📁 Criando diretórios..." -ForegroundColor Green

New-Item -ItemType Directory -Force -Path "C:\inetpub\wwwroot\sistema-assinaturas\uploads"
New-Item -ItemType Directory -Force -Path "C:\logs\sistema-assinaturas"

# 8. Configurar PM2 para Windows
Write-Host "🔄 Configurando PM2..." -ForegroundColor Green

# Instalar PM2 globalmente
npm install -g pm2
npm install -g pm2-windows-service

# Instalar PM2 como serviço do Windows
pm2-service-install

# 9. Testes finais
Write-Host "🧪 Executando testes..." -ForegroundColor Green

# Testar se o site está respondendo
try {
    $response = Invoke-WebRequest -Uri "http://$Domain" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Site acessível via HTTP (redirecionará para HTTPS)" -ForegroundColor Green
} catch {
    Write-Host "❌ Site não acessível via HTTP" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "https://$Domain" -UseBasicParsing -TimeoutSec 10 -SkipCertificateCheck
    Write-Host "✅ Site acessível via HTTPS" -ForegroundColor Green
} catch {
    Write-Host "❌ Site não acessível via HTTPS" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Configure o DNS para apontar $Domain para $ServerIP" -ForegroundColor Yellow
Write-Host "   2. Aguarde a propagação DNS (pode levar até 48 horas)" -ForegroundColor Yellow
Write-Host "   3. Inicie o backend: cd server && npm start" -ForegroundColor Yellow
Write-Host "   4. Inicie o frontend: cd client && npm start" -ForegroundColor Yellow
Write-Host "   5. Acesse: https://$Domain" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔧 Comandos úteis:" -ForegroundColor Cyan
Write-Host "   - Status IIS: Get-Service W3SVC" -ForegroundColor Yellow
Write-Host "   - Logs IIS: Get-EventLog -LogName Application -Source IIS*" -ForegroundColor Yellow
Write-Host "   - Status PM2: pm2 status" -ForegroundColor Yellow
Write-Host "   - Restart PM2: pm2 restart all" -ForegroundColor Yellow
Write-Host ""
Write-Host "📞 Suporte:" -ForegroundColor Cyan
Write-Host "   - Logs IIS: C:\inetpub\logs\LogFiles\" -ForegroundColor Yellow
Write-Host "   - Configuração: C:\inetpub\wwwroot\sistema-assinaturas\" -ForegroundColor Yellow
Write-Host "   - Certificados: certlm.msc" -ForegroundColor Yellow
