# 🔐 Documentação: Autenticação LDAP/Active Directory

## Visão Geral
Sistema de autenticação integrado com Active Directory da empresa, permitindo login usando credenciais do domínio (samAccountName + senha).

## ⚙️ Configuração LDAP

### Arquivo: `server/ldap-config.js`
```javascript
const ldapConfig = {
  url: 'ldap://santacasa.org:389',
  baseDN: 'DC=santacasa,DC=org',
  bindDN: 'CN=glpi,OU=USUARIOS,OU=SERVIDORES,DC=santacasa,DC=org',
  bindPassword: 'Dke-Pp!]CXp1P}h2GTy[',
  loginAttribute: 'samaccountname',
  searchAttributes: ['cn', 'mail', 'displayName', 'department', 'title', 'samaccountname'],
  timeout: 10000
};
```

## 🔄 Fluxo de Autenticação

1. **Usuário digita** samAccountName + senha
2. **Sistema conecta** ao AD usando usuário técnico
3. **Busca DN** do usuário pelo samAccountName
4. **Valida credenciais** fazendo bind com DN + senha
5. **Atualiza dados** do usuário no banco local
6. **Retorna JWT token** para acesso ao sistema

## 📁 Arquivos Principais

### Backend
- `server/ldap-config.js` - Configuração LDAP
- `server/ldap-auth.js` - Lógica de autenticação LDAP
- `server/index.js` - Endpoint de login modificado
- `server/database.js` - Colunas adicionais para dados do AD

### Frontend
- `client/src/components/Login.js` - Interface de login atualizada

## 🛠️ Implementação Backend

### Endpoint de Login
```javascript
// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Autenticar no AD
  const adUser = await authenticateLDAP(username, password);
  
  // Verificar se usuário existe no banco local
  const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  
  if (existingUser.rows.length > 0) {
    // Atualizar informações do AD
    await pool.query(`
      UPDATE users 
      SET name = $1, email = $2, department = $3, title = $4
      WHERE username = $5
    `, [adUser.displayName, adUser.email, adUser.department, adUser.title, username]);
    
    // Gerar JWT token
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user });
  } else {
    res.status(401).json({ error: 'Usuário não cadastrado no sistema' });
  }
});
```

### Classe LDAPAuth
```javascript
class LDAPAuth {
  async authenticate(username, password) {
    // 1. Conectar ao LDAP
    await this.connect();
    
    // 2. Fazer bind com usuário técnico
    await this.bindWithServiceAccount();
    
    // 3. Buscar o DN do usuário
    const userData = await this.findUserDN(username);
    
    // 4. Autenticar o usuário
    await this.authenticateUser(userData.dn, password);
    
    // 5. Retornar dados do usuário
    return userInfo;
  }
}
```

## 🎨 Frontend

### Interface de Login
- **Campo:** "Login do Domínio (samAccountName)"
- **Placeholder:** "exemplo: joao.silva"
- **Envia:** username e password para `/api/auth/login`

### Componente React
```javascript
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    // Tratar resultado
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="exemplo: joao.silva"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Entrar</button>
    </form>
  );
};
```

## 📦 Dependências

### Backend
```json
{
  "ldapjs": "^3.0.7"
}
```

### Instalação
```bash
npm install ldapjs
```

## ⚠️ Tratamento de Erros

- **Usuário não encontrado** no AD
- **Senha inválida** ou credenciais incorretas
- **Erros de conexão** LDAP
- **Timeout** de conexão
- **Usuário não cadastrado** no sistema local

## 🗄️ Banco de Dados

### Colunas Adicionais na Tabela `users`
```sql
ALTER TABLE users ADD COLUMN department VARCHAR(255);
ALTER TABLE users ADD COLUMN title VARCHAR(255);
ALTER TABLE users ADD COLUMN auth_mode VARCHAR(20) DEFAULT 'local';
```

## 🔧 Configuração do Ambiente

### Arquivo `.env`
```env
# Modo de Autenticação
AUTH_MODE=ad

# Configurações LDAP
LDAP_URL=ldap://santacasa.org:389
LDAP_BASE_DN=DC=santacasa,DC=org
LDAP_BIND_DN=CN=glpi,OU=USUARIOS,OU=SERVIDORES,DC=santacasa,DC=org
LDAP_BIND_PASSWORD=Dke-Pp!]CXp1P}h2GTy[
```

## 🧪 Teste de Conectividade

### Arquivo: `server/test-ldap.js`
```javascript
const { authenticateLDAP } = require('./ldap-auth');

async function testLDAPConnection() {
  try {
    const result = await authenticateLDAP('usuario.teste', 'senha123');
    console.log('✅ Autenticação bem-sucedida!', result);
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
  }
}
```

### Executar Teste
```bash
cd server
node test-ldap.js
```

## ✅ Resultado Final

O sistema agora autentica usuários diretamente no Active Directory da empresa, usando as credenciais do domínio (samAccountName + senha), sem necessidade de senhas locais. As informações do usuário são sincronizadas automaticamente com o AD.

## 📋 Checklist de Implementação

- [x] Instalar biblioteca `ldapjs`
- [x] Criar configuração LDAP
- [x] Implementar classe de autenticação
- [x] Modificar endpoint de login
- [x] Atualizar banco de dados
- [x] Atualizar interface de login
- [x] Implementar tratamento de erros
- [x] Criar script de teste
- [x] Configurar variáveis de ambiente

## 🔒 Segurança

- Usuário técnico tem acesso limitado apenas para busca
- Senhas não são armazenadas localmente
- Conexão LDAP usa timeout configurável
- JWT tokens com expiração de 24h
- Logs de auditoria para todas as tentativas de login
