const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function checkAndFixTestUsers() {
  try {
    console.log('🔍 Verificando usuários de teste...\n');

    // Usuários esperados (conforme documentação)
    const expectedUsers = [
      { username: 'supervisor.teste', email: 'supervisor.teste@santacasa.org', name: 'Supervisor Teste', role: 'supervisor', sector: 'TECNOLOGIA DA INFORMAÇÃO' },
      { username: 'contabilidade.teste', email: 'contabilidade.teste@santacasa.org', name: 'Contabilidade Teste', role: 'contabilidade', sector: 'CONTABILIDADE' },
      { username: 'financeiro.teste', email: 'financeiro.teste@santacasa.org', name: 'Financeiro Teste', role: 'financeiro', sector: 'FINANCEIRO' },
      { username: 'diretoria.teste', email: 'diretoria.teste@santacasa.org', name: 'Diretoria Teste', role: 'diretoria', sector: 'DIRETORIA' },
      // Também verificar os usernames alternativos do script
      { username: 'teste.supervisor', email: 'teste.supervisor@local', name: 'Teste Supervisor', role: 'supervisor', sector: 'TECNOLOGIA DA INFORMAÇÃO' },
      { username: 'teste.contabilidade', email: 'teste.contabilidade@local', name: 'Teste Contabilidade', role: 'contabilidade', sector: 'CONTABILIDADE' },
      { username: 'teste.financeiro', email: 'teste.financeiro@local', name: 'Teste Financeiro', role: 'financeiro', sector: 'FINANCEIRO' },
      { username: 'teste.diretoria', email: 'teste.diretoria@local', name: 'Teste Diretoria', role: 'diretoria', sector: 'DIRETORIA' },
      { username: 'teste.admin', email: 'teste.admin@local', name: 'Teste Admin', role: 'admin', sector: 'GERAL' }
    ];

    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('📋 Verificando e criando/corrigindo usuários...\n');

    for (const user of expectedUsers) {
      // Verificar se usuário existe
      const checkResult = await pool.query('SELECT * FROM users WHERE username = $1', [user.username]);
      
      if (checkResult.rows.length === 0) {
        // Usuário não existe - criar
        console.log(`➕ Criando usuário: ${user.username}`);
        await pool.query(
          `INSERT INTO users (username, email, password, name, role, sector, auth_mode) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [user.username, user.email, hashedPassword, user.name, user.role, user.sector, 'local']
        );
        console.log(`   ✅ Usuário criado: ${user.username}`);
      } else {
        // Usuário existe - verificar e corrigir se necessário
        const existingUser = checkResult.rows[0];
        const needsUpdate = [];
        
        if (existingUser.auth_mode !== 'local') {
          needsUpdate.push(`auth_mode: '${existingUser.auth_mode}' → 'local'`);
        }
        if (existingUser.password !== hashedPassword) {
          needsUpdate.push('password: atualizada');
        }
        if (existingUser.role !== user.role) {
          needsUpdate.push(`role: '${existingUser.role}' → '${user.role}'`);
        }
        if (existingUser.sector !== user.sector) {
          needsUpdate.push(`sector: '${existingUser.sector || 'null'}' → '${user.sector}'`);
        }

        if (needsUpdate.length > 0) {
          console.log(`🔄 Corrigindo usuário: ${user.username}`);
          console.log(`   Alterações: ${needsUpdate.join(', ')}`);
          
          await pool.query(
            `UPDATE users 
             SET password = $1, auth_mode = $2, role = $3, sector = $4, name = $5, email = $6
             WHERE username = $7`,
            [hashedPassword, 'local', user.role, user.sector, user.name, user.email, user.username]
          );
          console.log(`   ✅ Usuário corrigido: ${user.username}`);
        } else {
          console.log(`✅ Usuário OK: ${user.username}`);
        }
      }
    }

    console.log('\n📊 Listando todos os usuários de teste (auth_mode = local):');
    const allLocalUsers = await pool.query(
      `SELECT username, name, email, role, sector, auth_mode 
       FROM users 
       WHERE auth_mode = 'local' 
       ORDER BY username`
    );

    console.log('\n' + '='.repeat(80));
    console.log(`Total de usuários locais: ${allLocalUsers.rows.length}`);
    console.log('='.repeat(80));
    
    allLocalUsers.rows.forEach((u, index) => {
      console.log(`${index + 1}. ${u.username}`);
      console.log(`   Nome: ${u.name}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Setor: ${u.sector || 'N/A'}`);
      console.log(`   Auth Mode: ${u.auth_mode}`);
      console.log('');
    });

    console.log('\n✅ Verificação concluída!');
    console.log('\n📋 Credenciais para teste:');
    console.log('   Username: supervisor.teste | Senha: 123456');
    console.log('   Username: contabilidade.teste | Senha: 123456');
    console.log('   Username: financeiro.teste | Senha: 123456');
    console.log('   Username: diretoria.teste | Senha: 123456');
    console.log('\n   Ou use os usernames alternativos:');
    console.log('   Username: teste.supervisor | Senha: 123456');
    console.log('   Username: teste.contabilidade | Senha: 123456');
    console.log('   Username: teste.financeiro | Senha: 123456');
    console.log('   Username: teste.diretoria | Senha: 123456');
    console.log('   Username: teste.admin | Senha: 123456');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

checkAndFixTestUsers();

