// Configuração LDAP para Active Directory
const ldapConfig = {
  // Configurações de conexão LDAP
  url: 'ldap://santacasa.org:389',
  
  // Base DN para busca de usuários
  baseDN: 'DC=santacasa,DC=org',
  
  // Usuário técnico para bind inicial
  bindDN: 'CN=glpi,OU=USUARIOS,OU=SERVIDORES,DC=santacasa,DC=org',
  bindPassword: 'Dke-Pp!]CXp1P}h2GTy[',
  
  // Atributo usado para login (samaccountname)
  loginAttribute: 'samaccountname',
  
  // Atributos a serem retornados na busca
  searchAttributes: ['cn', 'mail', 'displayName', 'department', 'title', 'samaccountname'],
  
  // Configurações de timeout
  timeout: 10000, // 10 segundos
  
  // Configurações de reconexão
  reconnect: true,
  reconnectTimeout: 5000
};

module.exports = ldapConfig;
