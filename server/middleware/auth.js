/**
 * Middleware de autenticação JWT
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../database');

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'access_denied',
        message: 'Token de acesso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Buscar usuário no banco para verificar se ainda existe
    const userResult = await pool.query(
      'SELECT id, username, email, name, role, sector FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'user_not_found',
        message: 'Usuário não encontrado'
      });
    }

    // Adicionar informações do usuário ao request
    req.user = userResult.rows[0];
    next();

  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'token_expired',
        message: 'Token expirado'
      });
    }

    return res.status(500).json({
      error: 'auth_error',
      message: 'Erro interno na autenticação'
    });
  }
};

/**
 * Middleware opcional para autenticação (não bloqueia se não houver token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const userResult = await pool.query(
        'SELECT id, username, email, name, role, sector FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      }
    }

    next();
  } catch (error) {
    // Se houver erro, continua sem autenticação
    next();
  }
};

module.exports = authenticateToken;
module.exports.optional = optionalAuth;
