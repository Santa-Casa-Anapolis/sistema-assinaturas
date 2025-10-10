const { Client } = require('ldapts');
const ldapConfig = require('./ldap-config');

/**
 * Classe para autenticação LDAP com Active Directory usando ldapts
 */
class LDAPAuth {
  constructor() {
    this.client = null;
  }

  /**
   * Conecta ao servidor LDAP
   */
  async connect() {
    try {
      this.client = new Client({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.timeout
      });

      // A biblioteca ldapts conecta automaticamente, não precisa chamar connect()
      console.log('✅ Conectado ao servidor LDAP');
    } catch (error) {
      console.error('❌ Erro de conexão LDAP:', error.message);
      throw error;
    }
  }

  /**
   * Desconecta do servidor LDAP
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.unbind();
        console.log('🔌 Desconectado do servidor LDAP');
      } catch (error) {
        console.log('⚠️ Erro ao desconectar:', error.message);
      }
      this.client = null;
    }
  }

  /**
   * Faz bind com credenciais de usuário técnico
   */
  async bindWithServiceAccount() {
    try {
      await this.client.bind(ldapConfig.bindDN, ldapConfig.bindPassword);
      console.log('✅ Bind do usuário técnico realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no bind do usuário técnico:', error.message);
      throw new Error(`Erro na autenticação do usuário técnico: ${error.message}`);
    }
  }

  /**
   * Busca o DN do usuário pelo samaccountname
   */
  async findUserDN(username) {
    try {
      const searchOptions = {
        scope: 'sub',
        filter: `(${ldapConfig.loginAttribute}=${username})`,
        attributes: ldapConfig.searchAttributes
      };

      const { searchEntries } = await this.client.search(ldapConfig.baseDN, searchOptions);
      
      if (!searchEntries || searchEntries.length === 0) {
        console.log(`❌ Usuário não encontrado: ${username}`);
        throw new Error('Usuário não encontrado no Active Directory');
      }

      const entry = searchEntries[0];
      const userData = {
        dn: entry.dn,
        attributes: entry
      };

      console.log(`✅ Usuário encontrado: ${userData.dn}`);
      return userData;
    } catch (error) {
      console.error('❌ Erro na busca do usuário:', error.message);
      throw new Error(`Erro na busca do usuário: ${error.message}`);
    }
  }

  /**
   * Autentica o usuário fazendo bind com suas credenciais
   */
  async authenticateUser(userDN, password) {
    try {
      // Validar se a senha é uma string válida
      if (!password || typeof password !== 'string') {
        console.error('❌ Senha inválida:', typeof password);
        throw new Error('Senha inválida ou credenciais incorretas');
      }

      console.log(`🔍 Tipo da senha: ${typeof password}, Tamanho: ${password.length}`);
      console.log(`🔍 UserDN: ${userDN}`);
      console.log(`🔍 URL LDAP: ${ldapConfig.url}`);

      // Criar um novo cliente para autenticação do usuário
      console.log('🔧 Criando novo cliente LDAP para autenticação do usuário...');
      const userClient = new Client({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.timeout
      });

      console.log('🔧 Cliente LDAP criado, tentando fazer bind...');
      
      try {
        // A biblioteca ldapts conecta automaticamente quando faz o bind
        await userClient.bind(userDN, password);
        console.log('✅ Usuário autenticado com sucesso');
        return true;
      } catch (bindError) {
        console.error('❌ Erro específico no bind:', bindError.message);
        console.error('❌ Stack trace:', bindError.stack);
        throw bindError;
      } finally {
        // Sempre tentar desconectar o cliente do usuário
        console.log('🔧 Tentando desconectar cliente do usuário...');
        try {
          await userClient.unbind();
          console.log('✅ Cliente do usuário desconectado');
        } catch (unbindError) {
          console.log('⚠️ Erro ao desconectar cliente do usuário:', unbindError.message);
        }
      }
    } catch (error) {
      console.error('❌ Erro na autenticação do usuário:', error.message);
      console.error('❌ Stack trace completo:', error.stack);
      throw new Error('Senha inválida ou credenciais incorretas');
    }
  }

  /**
   * Busca os grupos de um usuário
   * @param {string} userDN - DN do usuário
   * @returns {Array} - Lista de grupos
   */
  async getUserGroups(userDN) {
    try {
      console.log(`🔍 Buscando grupos para: ${userDN}`);
      
      const searchOptions = {
        scope: 'base',
        filter: '(objectClass=*)',
        attributes: ['memberOf']
      };

      const { searchEntries } = await this.client.search(userDN, searchOptions);
      
      if (!searchEntries || searchEntries.length === 0) {
        console.log('⚠️ Nenhum grupo encontrado para o usuário');
        return [];
      }

      const entry = searchEntries[0];
      let groups = [];

      if (entry.memberOf) {
        // memberOf pode ser um array ou string única
        const memberOfArray = Array.isArray(entry.memberOf) ? entry.memberOf : [entry.memberOf];
        
        groups = memberOfArray.map(groupDN => {
          // Extrair o nome do grupo do DN
          const cnMatch = groupDN.match(/CN=([^,]+)/);
          return cnMatch ? cnMatch[1] : groupDN;
        });
      }

      console.log(`✅ Encontrados ${groups.length} grupos:`, groups);
      return groups;

    } catch (error) {
      console.error('❌ Erro ao buscar grupos do usuário:', error.message);
      return [];
    }
  }

  /**
   * Método principal de autenticação
   * @param {string} username - samaccountname do usuário
   * @param {string} password - senha do usuário
   * @returns {Object} - Dados do usuário autenticado
   */
  async authenticate(username, password) {
    try {
      console.log(`🔐 Iniciando autenticação LDAP para: ${username}`);
      console.log(`🔍 Tipo da senha: ${typeof password}, Tamanho: ${password ? password.length : 'null'}`);
      console.log(`🔍 Configuração LDAP:`, {
        url: ldapConfig.url,
        baseDN: ldapConfig.baseDN,
        bindDN: ldapConfig.bindDN,
        loginAttribute: ldapConfig.loginAttribute
      });
      
      // 1. Conectar ao LDAP
      console.log('📡 Passo 1: Conectando ao servidor LDAP...');
      await this.connect();
      
      // 2. Fazer bind com usuário técnico
      console.log('🔑 Passo 2: Fazendo bind com usuário técnico...');
      await this.bindWithServiceAccount();
      
      // 3. Buscar o DN do usuário
      console.log('🔍 Passo 3: Buscando DN do usuário...');
      const userData = await this.findUserDN(username);
      console.log('📋 Dados do usuário encontrados:', {
        dn: userData.dn,
        attributes: userData.attributes
      });
      
      // 4. Autenticar o usuário com suas credenciais
      console.log('🔐 Passo 4: Autenticando usuário com credenciais...');
      await this.authenticateUser(userData.dn, password);
      
      // 5. Buscar grupos do usuário
      console.log('👥 Passo 5: Buscando grupos do usuário...');
      const userGroups = await this.getUserGroups(userData.dn);
      
      // 6. Retornar dados do usuário
      const userInfo = {
        username: username,
        dn: userData.dn,
        displayName: userData.attributes.displayName || userData.attributes.cn,
        email: userData.attributes.mail,
        department: userData.attributes.department,
        title: userData.attributes.title,
        samaccountname: userData.attributes.samaccountname,
        groups: userGroups
      };

      console.log('✅ Autenticação LDAP bem-sucedida');
      console.log('📊 Informações do usuário autenticado:', userInfo);
      return userInfo;

    } catch (error) {
      console.error('❌ Falha na autenticação LDAP:', error.message);
      console.error('❌ Stack trace completo:', error.stack);
      throw error;
    } finally {
      // Sempre desconectar
      console.log('🔌 Desconectando do servidor LDAP...');
      await this.disconnect();
    }
  }
}

/**
 * Função auxiliar para autenticação LDAP
 * @param {string} username - samaccountname do usuário
 * @param {string} password - senha do usuário
 * @returns {Object} - Dados do usuário autenticado
 */
async function authenticateLDAP(username, password) {
  const ldapAuth = new LDAPAuth();
  return await ldapAuth.authenticate(username, password);
}

module.exports = {
  LDAPAuth,
  authenticateLDAP
};