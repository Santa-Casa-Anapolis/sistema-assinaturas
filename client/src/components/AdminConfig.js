import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  Users, 
  Building, 
  Save,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const AdminConfig = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newSupervisor, setNewSupervisor] = useState({
    name: '',
    email: '',
    password: '',
    sector: ''
  });

  // Setores disponíveis
  const availableSectors = [
    'SETOR TECNOLOGIA DA INFORMAÇÃO',
    'SETOR CONTABILIDADE',
    'SETOR CENTRO DE IMAGEM',
    'SETOR CENTRO MEDICO',
    'SETOR FINANCEIRO',
    'SETOR RH',
    'SETOR COMPRAS',
    'SETOR MANUTENÇÃO'
  ];

  // Buscar supervisores
  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const response = await axios.get('/api/users/by-role/supervisor');
      setSupervisors(response.data);
    } catch (error) {
      toast.error('Erro ao carregar supervisores');
    } finally {
      setLoading(false);
    }
  };

  // Adicionar novo supervisor
  const handleAddSupervisor = async (e) => {
    e.preventDefault();
    
    if (!newSupervisor.name || !newSupervisor.email || !newSupervisor.password || !newSupervisor.sector) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      await axios.post('/api/admin/supervisors', newSupervisor);
      toast.success('Supervisor adicionado com sucesso!');
      setNewSupervisor({ name: '', email: '', password: '', sector: '' });
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar supervisor');
    } finally {
      setSaving(false);
    }
  };

  // Atualizar supervisor
  const handleUpdateSupervisor = async (supervisor) => {
    setSaving(true);
    try {
      await axios.put(`/api/admin/supervisors/${supervisor.id}`, {
        sector: supervisor.sector
      });
      toast.success('Setor atualizado com sucesso!');
      setEditingId(null);
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar supervisor');
    } finally {
      setSaving(false);
    }
  };

  // Remover supervisor
  const handleRemoveSupervisor = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este supervisor?')) {
      return;
    }

    setSaving(true);
    try {
      await axios.delete(`/api/admin/supervisors/${id}`);
      toast.success('Supervisor removido com sucesso!');
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao remover supervisor');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuração de Supervisores
        </h1>
        <p className="text-gray-600">
          Configure os supervisores e seus respectivos setores para organização dos documentos
        </p>
      </div>

      {/* Adicionar novo supervisor */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Novo Supervisor
        </h2>
        
                 <form onSubmit={handleAddSupervisor} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Supervisor
            </label>
            <input
              type="text"
              value={newSupervisor.name}
              onChange={(e) => setNewSupervisor({...newSupervisor, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome completo"
              required
            />
          </div>
          
                     <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               E-mail
             </label>
             <input
               type="email"
               value={newSupervisor.email}
               onChange={(e) => setNewSupervisor({...newSupervisor, email: e.target.value})}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="email@empresa.com"
               required
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Senha
             </label>
             <input
               type="password"
               value={newSupervisor.password}
               onChange={(e) => setNewSupervisor({...newSupervisor, password: e.target.value})}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="Senha do usuário"
               required
             />
           </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Setor
            </label>
            <select
              value={newSupervisor.sector}
              onChange={(e) => setNewSupervisor({...newSupervisor, sector: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecione o setor</option>
              {availableSectors.map(sector => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
          </div>
          
                     <div className="md:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Adicionar Supervisor
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de supervisores */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Supervisores Configurados
          </h2>
          
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Carregando supervisores...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supervisor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Setor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supervisors.map((supervisor) => (
                  <tr key={supervisor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {supervisor.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {supervisor.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === supervisor.id ? (
                        <select
                          value={supervisor.sector || ''}
                          onChange={(e) => {
                            const updated = supervisors.map(s => 
                              s.id === supervisor.id ? {...s, sector: e.target.value} : s
                            );
                            setSupervisors(updated);
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Sem setor</option>
                          {availableSectors.map(sector => (
                            <option key={sector} value={sector}>{sector}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center">
                          {supervisor.sector ? (
                            <>
                              <Building className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm text-gray-900">{supervisor.sector}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                              <span className="text-sm text-yellow-600">Setor não definido</span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingId === supervisor.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateSupervisor(supervisor)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingId(supervisor.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveSupervisor(supervisor.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {supervisors.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum supervisor configurado</p>
                <p className="text-sm text-gray-400">Adicione supervisores acima para começar</p>
              </div>
            )}
          </div>
        )}
      </div>

      

      {/* Informações sobre organização */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          📁 Organização dos Documentos
        </h3>
        <p className="text-blue-800 text-sm">
          Os documentos serão organizados automaticamente na pasta de rede seguindo a estrutura:
        </p>
        <div className="mt-2 text-blue-700 text-sm">
          <code>Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\[SETOR]\[ANO]\[MÊS]</code>
        </div>
        <p className="text-blue-800 text-sm mt-2">
          Exemplo: Um documento do supervisor de Tecnologia da Informação em janeiro de 2025 será salvo em:
          <br />
          <code>Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\SETOR TECNOLOGIA DA INFORMAÇÃO\2025\JANEIRO</code>
        </p>
      </div>
    </div>
  );
};

export default AdminConfig;
