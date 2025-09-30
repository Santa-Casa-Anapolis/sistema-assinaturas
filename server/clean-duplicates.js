const { pool } = require('./database');

async function cleanDuplicateUsers() {
  try {
    console.log('🧹 Iniciando limpeza de usuários duplicados...');

    // Remover usuários duplicados mantendo apenas o primeiro de cada username
    const result = await pool.query(`
      DELETE FROM users
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM users
        GROUP BY username
      )
    `);

    console.log(`✅ Removidos ${result.rowCount} usuários duplicados`);

    // Verificar usuários restantes
    const users = await pool.query('SELECT id, name, email, username, role FROM users ORDER BY id');
    console.log('\n📋 Usuários restantes:');
    users.rows.forEach(user => {
      console.log(`- ID: ${user.id} | ${user.name} | ${user.email || 'N/A'} | ${user.username} | ${user.role}`);
    });

    console.log(`\n✅ Total de usuários únicos: ${users.rowCount}`);

  } catch (error) {
    console.error('❌ Erro ao limpar usuários duplicados:', error);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanDuplicateUsers();
}

module.exports = { cleanDuplicateUsers };
