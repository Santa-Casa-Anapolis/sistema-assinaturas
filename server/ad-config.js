const ldap = require('ldapjs');

// Configuração do Active Directory
const AD_CONFIG = {
  url: process.env.AD_URL || 'ldap://ad.exemplo.com:389',
  baseDN: process.env.AD_BASE_DN || 'DC=exemplo,DC=com',
  username: process.env.AD_USERNAME || 'CN=ServiceAccount,OU=ServiceAccounts,DC=exemplo,DC=com',
  password: process.env.AD_PASSWORD || 'senha_do_service_account'
};

// Cliente LDAP
let ldapClient = null;

// Função para conectar ao AD
async function connectToAD() {
  return new Promise((resolve, reject) => {
    ldapClient = ldap.createClient({
      url: AD_CONFIG.url,
      timeout: 5000,
      connectTimeout: 10000
    });

    ldapClient.on('error', (err) => {
      console.error('❌ Erro na conexão LDAP:', err);
      reject(err);
    });

    ldapClient.on('connect', () => {
      console.log('✅ Conectado ao Active Directory');
      resolve(ldapClient);
    });
  });
}

// Função para autenticar usuário no AD
async function authenticateUser(username, password) {
  return new Promise((resolve, reject) => {
    if (!ldapClient) {
      return reject(new Error('Cliente LDAP não conectado'));
    }

    // Buscar usuário no AD
    const searchOptions = {
      scope: 'sub',
      filter: `(sAMAccountName=${username})`,
      attributes: ['cn', 'mail']
    };

    ldapClient.search(AD_CONFIG.baseDN, searchOptions, (err, res) => {
      if (err) {
        return reject(err);
      }

      let userFound = false;
      let userData = null;

      res.on('searchEntry', (entry) => {
        userFound = true;
        userData = {
          dn: entry.objectName,
          cn: entry.object.cn,
          email: entry.object.mail
        };
      });

      res.on('error', (err) => {
        reject(err);
      });

      res.on('end', () => {
        if (!userFound) {
          return reject(new Error('Usuário não encontrado no AD'));
        }

        // Tentar autenticar com as credenciais fornecidas
        ldapClient.bind(userData.dn, password, (err) => {
          if (err) {
            return reject(new Error('Credenciais inválidas'));
          }

          // Retornar apenas dados básicos - role e setor serão definidos na plataforma
          resolve({
            username: username,
            name: userData.cn,
            email: userData.email || `${username}@empresa.com`
          });
        });
      });
    });
  });
}

// Função para buscar todos os usuários do AD
async function getAllADUsers() {
  return new Promise((resolve, reject) => {
    if (!ldapClient) {
      return reject(new Error('Cliente LDAP não conectado'));
    }

    const searchOptions = {
      scope: 'sub',
      filter: '(objectClass=user)',
      attributes: ['cn', 'mail', 'sAMAccountName']
    };

    ldapClient.search(AD_CONFIG.baseDN, searchOptions, (err, res) => {
      if (err) {
        return reject(err);
      }

      const users = [];

      res.on('searchEntry', (entry) => {
        users.push({
          username: entry.object.sAMAccountName,
          name: entry.object.cn,
          email: entry.object.mail || `${entry.object.sAMAccountName}@empresa.com`
        });
      });

      res.on('error', (err) => {
        reject(err);
      });

      res.on('end', () => {
        resolve(users);
      });
    });
  });
}

// Função para desconectar do AD
function disconnectFromAD() {
  if (ldapClient) {
    ldapClient.unbind();
    ldapClient = null;
  }
}

module.exports = {
  AD_CONFIG,
  connectToAD,
  authenticateUser,
  getAllADUsers,
  disconnectFromAD
};
