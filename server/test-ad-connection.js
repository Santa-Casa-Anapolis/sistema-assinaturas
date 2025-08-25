const { connectToAD, authenticateUser, getUsersByRole, disconnectFromAD } = require('./ad-config');
require('dotenv').config();

async function testADConnection() {
  console.log('🔍 Testando conexão com Active Directory...\n');

  try {
    // Testar conexão
    console.log('1️⃣ Conectando ao AD...');
    await connectToAD();
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // Testar autenticação (se credenciais fornecidas)
    if (process.argv.includes('--test-auth')) {
      const username = process.argv[process.argv.indexOf('--test-auth') + 1];
      const password = process.argv[process.argv.indexOf('--test-auth') + 2];
      
      if (username && password) {
        console.log(`2️⃣ Testando autenticação do usuário: ${username}`);
        const user = await authenticateUser(username, password);
        console.log('✅ Autenticação bem-sucedida!');
        console.log('📋 Dados do usuário:');
        console.log(`   Nome: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Setor: ${user.sector || 'Não definido'}`);
        console.log(`   Departamento: ${user.department || 'Não definido'}\n`);
      } else {
        console.log('⚠️  Para testar autenticação, use: node test-ad-connection.js --test-auth username password\n');
      }
    }

    // Testar busca de usuários por role
    if (process.argv.includes('--test-users')) {
      const role = process.argv[process.argv.indexOf('--test-users') + 1] || 'supervisor';
      
      console.log(`3️⃣ Buscando usuários com role: ${role}`);
      const users = await getUsersByRole(role);
      console.log(`✅ Encontrados ${users.length} usuários:`);
      
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      });
      console.log('');
    }

    // Desconectar
    await disconnectFromAD();
    console.log('4️⃣ Desconectado do AD');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possíveis soluções:');
      console.log('   - Verifique se o servidor AD está acessível');
      console.log('   - Verifique se a porta 389 está aberta');
      console.log('   - Verifique a URL do AD na configuração');
    } else if (error.message.includes('Credenciais inválidas')) {
      console.log('\n💡 Possíveis soluções:');
      console.log('   - Verifique as credenciais do usuário');
      console.log('   - Verifique se o usuário existe no AD');
    } else if (error.message.includes('Service Account')) {
      console.log('\n💡 Possíveis soluções:');
      console.log('   - Verifique as credenciais do Service Account');
      console.log('   - Verifique as permissões do Service Account');
    }
  }
}

// Verificar configuração
console.log('📋 Configuração atual:');
console.log(`   AD_URL: ${process.env.AD_URL || 'Não configurado'}`);
console.log(`   AD_BASE_DN: ${process.env.AD_BASE_DN || 'Não configurado'}`);
console.log(`   AD_USERNAME: ${process.env.AD_USERNAME || 'Não configurado'}`);
console.log(`   AUTH_MODE: ${process.env.AUTH_MODE || 'local'}\n`);

// Executar teste
testADConnection();

// Exemplos de uso
console.log('📖 Exemplos de uso:');
console.log('   node test-ad-connection.js');
console.log('   node test-ad-connection.js --test-auth joao.silva senha123');
console.log('   node test-ad-connection.js --test-users supervisor');
console.log('   node test-ad-connection.js --test-auth joao.silva senha123 --test-users supervisor');
