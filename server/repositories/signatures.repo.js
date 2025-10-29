const { pool } = require('../config/database');

/**
 * Buscar assinatura por user_id (usando apenas colunas existentes)
 */
async function findByUserId(userId) {
  try {
    const result = await pool.query(`
      SELECT id, user_id, signature_file, original_filename, created_at, updated_at
      FROM user_signatures
      WHERE user_id = $1
      LIMIT 1
    `, [userId]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Erro ao buscar assinatura por user_id:', error);
    throw error;
  }
}

/**
 * Upsert de assinatura (inserir ou atualizar)
 */
async function upsertSignature(userId, relPath, originalName) {
  try {
    const result = await pool.query(`
      INSERT INTO user_signatures (user_id, signature_file, original_filename, created_at, updated_at)
      VALUES ($1, $2, $3, now(), now())
      ON CONFLICT (user_id) DO UPDATE
        SET signature_file = EXCLUDED.signature_file,
            original_filename = EXCLUDED.original_filename,
            updated_at = now()
      RETURNING *
    `, [userId, relPath, originalName]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro ao fazer upsert da assinatura:', error);
    throw error;
  }
}

/**
 * Deletar assinatura por user_id
 */
async function deleteByUserId(userId) {
  try {
    const result = await pool.query(`
      DELETE FROM user_signatures
      WHERE user_id = $1
      RETURNING *
    `, [userId]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Erro ao deletar assinatura:', error);
    throw error;
  }
}

module.exports = {
  findByUserId,
  upsertSignature,
  deleteByUserId
};

