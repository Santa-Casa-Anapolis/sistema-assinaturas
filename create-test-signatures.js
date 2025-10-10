const fs = require('fs');
const path = require('path');

// Script para criar assinaturas de teste simples
console.log('🖊️ Criando assinaturas de teste...');

// Criar diretório de assinaturas se não existir
const signaturesDir = path.join(__dirname, 'server', 'uploads', 'signatures');
if (!fs.existsSync(signaturesDir)) {
  fs.mkdirSync(signaturesDir, { recursive: true });
  console.log('✅ Diretório de assinaturas criado');
}

// Usuários de teste
const testUsers = [
  { username: 'admin@santacasa.org', name: 'Administrador Sistema' },
  { username: 'supervisor@santacasa.org', name: 'Supervisor Setor A' },
  { username: 'contabilidade@santacasa.org', name: 'Contabilidade' },
  { username: 'financeiro@santacasa.org', name: 'Financeiro' },
  { username: 'diretoria@santacasa.org', name: 'Diretoria' }
];

// Criar assinaturas simples em texto
testUsers.forEach(user => {
  const signatureContent = `${user.name}
________________
Data: ${new Date().toLocaleDateString('pt-BR')}
Sistema de Assinaturas - Santa Casa`;
  
  const signaturePath = path.join(signaturesDir, `${user.username}.txt`);
  fs.writeFileSync(signaturePath, signatureContent, 'utf8');
  console.log(`✅ Assinatura criada: ${user.name}`);
});

console.log('\n🎯 Assinaturas criadas!');
console.log('📁 Localização:', signaturesDir);
console.log('\n📋 Próximos passos:');
console.log('1. Acesse o sistema com cada usuário');
console.log('2. Vá para "Minhas Assinaturas"');
console.log('3. Faça upload de uma imagem de assinatura real');
console.log('4. Ou use as assinaturas de texto criadas');
