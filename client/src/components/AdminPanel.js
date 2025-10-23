import React, { useState, useEffect, useCallback } from 'react';
import axios from '../config/api';
import { Users, UserPlus, Settings, Shield, Trash2, Edit, Search } from 'lucide-react';
import UserSignatureManager from './UserSignatureManager';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  // const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    username: '',
    role: 'operacional',
    password: '',
    sector: '',
    profile: '',
    group_name: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({});
  const [managingSignature, setManagingSignature] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    permissions: []
  });

  const availablePermissions = [
    'upload_document',
    'view_own_documents',
    'view_sector_documents',
    'review_documents',
    'approve_documents',
    'manage_sector_users',
    'view_all_documents',
    'financial_approval',
    'audit_documents',
    'payment_approval',
    'budget_approval',
    'final_approval',
    'strategic_approval',
    'admin_access',
    'manage_users',
    'manage_groups'
  ];

  const filterUsers = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.sector && user.sector.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterUsers]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        }
      });
      
      
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        console.error('❌ Dados não são um array:', response.data);
        alert('Erro: dados de usuários em formato inválido');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      console.error('❌ Detalhes do erro:', error.response?.data || error.message);
      alert(`Erro de conexão: ${error.message}`);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get('/admin/groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        }
      });
      
      
      if (Array.isArray(response.data)) {
        setGroups(response.data);
      } else {
        console.error('❌ Dados de grupos não são um array:', response.data);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar grupos:', error);
      console.error('❌ Detalhes do erro:', error.response?.data || error.message);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    console.log('Dados do usuário a ser criado:', newUser);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setShowCreateUser(false);
        setNewUser({
          name: '',
          email: '',
          username: '',
          role: 'fornecedor',
          password: '',
          sector: '',
          profile: '',
          group_name: ''
        });
        fetchUsers();
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        },
        body: JSON.stringify(newGroup)
      });

      if (response.ok) {
        setShowCreateGroup(false);
        setNewGroup({
          name: '',
          description: '',
          permissions: []
        });
        fetchGroups();
      }
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
          }
        });

        if (response.ok) {
          fetchUsers();
        }
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditUserData({
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      sector: user.sector,
      group_name: user.group_name
    });
  };

  const handleUpdateUser = async () => {
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        },
        body: JSON.stringify(editUserData)
      });

      if (response.ok) {
        setEditingUser(null);
        setEditUserData({});
        fetchUsers();
        alert('Usuário atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário.');
    }
  };

  const assignUserToGroup = async (userId, groupId) => {
    try {
      const response = await fetch('/api/admin/assign-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sa.token')}`
        },
        body: JSON.stringify({ userId, groupId })
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Erro ao atribuir usuário ao grupo:', error);
    }
  };

  const togglePermission = (permission) => {
    setNewGroup(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Painel de Administração</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateUser(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Novo Usuário</span>
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span>Novo Grupo</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button className="border-b-2 border-blue-500 py-2 px-1 text-blue-600 font-medium">
                Cadastro ({users.length})
              </button>
              <button className="border-b-2 border-transparent py-2 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Grupos ({groups.length})
              </button>
            </nav>
          </div>

          {/* Campo de Pesquisa */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar usuários por nome, email, username, role ou setor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            {searchTerm && (
              <p className="mt-2 text-sm text-gray-600">
                {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Lista de Usuários */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(searchTerm ? filteredUsers : users).map((user) => (
              <div key={user.id} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {user.is_admin && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Função:</span>
                    <span className="font-medium capitalize">{user.role}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Setor:</span>
                    <span className="font-medium">{user.sector}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Grupo:</span>
                    <span className="font-medium">{user.group_name || 'Não atribuído'}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <select
                    className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                    value={user.group_id || ''}
                    onChange={(e) => assignUserToGroup(user.id, e.target.value)}
                  >
                    <option value="">Selecionar Grupo</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={() => setManagingSignature(user)}
                    className="p-1 text-gray-400 hover:text-green-600"
                    title="Gerenciar assinatura"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleEditUser(user)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Editar usuário"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Excluir usuário"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Criar Usuário */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Criar Novo Usuário</h2>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="nome.usuario"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="operacional">Operacional</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="contabilidade">Contabilidade</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="diretoria">Diretoria</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil no Fluxo
                </label>
                <select
                  value={newUser.profile}
                  onChange={(e) => {
                    console.log('Perfil selecionado:', e.target.value);
                    setNewUser({...newUser, profile: e.target.value});
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Selecione um perfil</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="contabilidade">Contabilidade</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="diretoria">Diretoria</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <select
                  value={newUser.sector}
                  onChange={(e) => setNewUser({...newUser, sector: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Selecione um setor</option>
                  <option value="TECNOLOGIA DA INFORMAÇÃO">Tecnologia da Informação</option>
                  <option value="CONTABILIDADE">Contabilidade</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="DIRETORIA">Diretoria</option>
                  <option value="RECURSOS HUMANOS">Recursos Humanos</option>
                  <option value="DEPARTAMENTO PESSOAL">Departamento Pessoal</option>
                  <option value="FARMÁCIA">Farmácia</option>
                  <option value="CENTRAL DE IMAGEM">Central de Imagem</option>
                  <option value="LABORATÓRIO">Laboratório</option>
                  <option value="CENTRO MÉDICO">Centro Médico</option>
                  <option value="COMPRAS">Compras</option>
                  <option value="MANUTENÇÃO">Manutenção</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Grupo */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Criar Novo Grupo</h2>
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Grupo
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissões
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {availablePermissions.map(permission => (
                    <label key={permission} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newGroup.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded"
                      />
                      <span className="capitalize">{permission.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Criar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Editar Usuário</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateUser(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editUserData.name}
                  onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUserData.username}
                  onChange={(e) => setEditUserData({...editUserData, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="operacional">Operacional</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="contabilidade">Contabilidade</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="diretoria">Diretoria</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <select
                  value={editUserData.sector}
                  onChange={(e) => setEditUserData({...editUserData, sector: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Selecione um setor</option>
                  <option value="TECNOLOGIA DA INFORMAÇÃO">Tecnologia da Informação</option>
                  <option value="CONTABILIDADE">Contabilidade</option>
                  <option value="FINANCEIRO">Financeiro</option>
                  <option value="DIRETORIA">Diretoria</option>
                  <option value="RECURSOS HUMANOS">Recursos Humanos</option>
                  <option value="DEPARTAMENTO PESSOAL">Departamento Pessoal</option>
                  <option value="FARMÁCIA">Farmácia</option>
                  <option value="CENTRAL DE IMAGEM">Central de Imagem</option>
                  <option value="LABORATÓRIO">Laboratório</option>
                  <option value="CENTRO MÉDICO">Centro Médico</option>
                  <option value="COMPRAS">Compras</option>
                  <option value="MANUTENÇÃO">Manutenção</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Atualizar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Assinatura */}
      {managingSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Gerenciar Assinatura - {managingSignature.name}
              </h3>
              <button
                onClick={() => setManagingSignature(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <UserSignatureManager
                userId={managingSignature.id}
                userName={managingSignature.name}
                onSignatureChange={() => {
                  // Opcional: atualizar lista de usuários se necessário
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
