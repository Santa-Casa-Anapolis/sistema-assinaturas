const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function createTestUsers() {
  try {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Hash gerado:', hashedPassword);
    console.log('Tamanho do hash:', hashedPassword.length);
    
    const users = [
      { username: 'teste.supervisor', email: 'teste.supervisor@local', name: 'Teste Supervisor', role: 'supervisor' },
      { username: 'teste.contabilidade', email: 'teste.contabilidade@local', name: 'Teste Contabilidade', role: 'contabilidade' },
      { username: 'teste.financeiro', email: 'teste.financeiro@local', name: 'Teste Financeiro', role: 'financeiro' },
      { username: 'teste.diretoria', email: 'teste.diretoria@local', name: 'Teste Diretoria', role: 'diretoria' },
      { username: 'teste.admin', email: 'teste.admin@local', name: 'Teste Admin', role: 'admin' }
    ];
    
    for (const user of users) {
      await pool.query(
        `INSERT INTO users (username, email, password, name, role, auth_mode) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (username) DO UPDATE 
         SET password = EXCLUDED.password, auth_mode = EXCLUDED.auth_mode`,
        [user.username, user.email, hashedPassword, user.name, user.role, 'local']
      );
      console.log(`✅ Usuário criado/atualizado: ${user.username}`);
    }
    
    console.log('\n✅ Todos os usuários de teste foram criados!');
    console.log('\n📋 Credenciais:');
    users.forEach(u => {
      console.log(`  Username: ${u.username} | Senha: 123456 | Papel: ${u.role}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

createTestUsers();















