const { authenticateLDAP } = require('./ldap-auth');

async function testLDAPConnection() {
  console.log('🧪 Testando conexão LDAP com Active Directory...');
  console.log('=' .repeat(50));
  
  // Dados de teste - SUBSTITUA pelos dados reais de um usuário
  const testUsername = 'usuario.teste'; // Substitua pelo samAccountName real
  const testPassword = 'senha123'; // Substitua pela senha real
  
  try {
    console.log(`🔐 Tentando autenticar usuário: ${testUsername}`);
    
    const result = await authenticateLDAP(testUsername, testPassword);
    
    console.log('✅ Autenticação bem-sucedida!');
    console.log('📋 Dados do usuário:');
    console.log(`   - Username: ${result.username}`);
    console.log(`   - Display Name: ${result.displayName}`);
    console.log(`   - Email: ${result.email}`);
    console.log(`   - Department: ${result.department}`);
    console.log(`   - Title: ${result.title}`);
    console.log(`   - DN: ${result.dn}`);
    
  } catch (error) {
    console.error('❌ Erro na autenticação:');
    console.error(`   - Mensagem: ${error.message}`);
    
    if (error.message.includes('Usuário não encontrado')) {
      console.log('💡 Verifique se o usuário existe no Active Directory');
    } else if (error.message.includes('Senha inválida')) {
      console.log('💡 Verifique se a senha está correta');
    } else if (error.message.includes('conexão')) {
      console.log('💡 Verifique a conectividade com o servidor LDAP');
      console.log('💡 Verifique se o servidor santacasa.org está acessível');
    } else {
      console.log('💡 Verifique a configuração LDAP no arquivo ldap-config.js');
    }
  }
  
  console.log('=' .repeat(50));
  console.log('🏁 Teste concluído');
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testLDAPConnection().catch(console.error);
}

module.exports = { testLDAPConnection };
