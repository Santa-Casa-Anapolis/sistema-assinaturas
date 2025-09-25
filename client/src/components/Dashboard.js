import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Upload, 
  Users,
  TrendingUp,
  Shield,
  ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    total: 0
  });
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar documentos pendentes
      const pendingResponse = await axios.get('/api/documents/pending');
      const pendingCount = pendingResponse.data.length;

      // Buscar documentos do usuário
      const myDocsResponse = await axios.get('/api/documents/my-documents');
      const myDocs = myDocsResponse.data;
      const completedCount = myDocs.filter(doc => doc.status === 'completed').length;
      const totalCount = myDocs.length;

      setStats({
        pending: pendingCount,
        completed: completedCount,
        total: totalCount
      });

      // Documentos recentes (últimos 5)
      setRecentDocuments(myDocs.slice(0, 5));
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'fornecedor': 'Fornecedor',
      'supervisor': 'Supervisor',
      'contabilidade': 'Contabilidade',
      'financeiro': 'Financeiro',
      'diretoria': 'Diretoria'
    };
    return roleNames[role] || role;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'Pendente',
      'completed': 'Concluído',
      'in_progress': 'Em Andamento'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 spinner" style={{borderTopColor: 'var(--border-focus)'}}></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
          Bem-vindo, {user.name}!
        </h1>
        <p style={{color: 'var(--text-secondary)'}}>
          Sistema de Assinaturas Digitais para Notas Fiscais
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-200" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Pendentes</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-200" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Concluídos</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-200" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>Total</p>
              <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          to="/upload"
          className="card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Upload className="h-5 w-5 text-blue-600 dark:text-blue-200" />
            </div>
            <div>
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>Enviar Documento</h3>
              <p className="text-sm" style={{color: 'var(--text-muted)'}}>Upload e fluxo de assinaturas</p>
            </div>
          </div>
        </Link>

        <Link
          to="/pending"
          className="card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-200" />
            </div>
            <div>
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>Pendentes</h3>
              <p className="text-sm" style={{color: 'var(--text-muted)'}}>Documentos para assinar</p>
            </div>
          </div>
        </Link>

        <Link
          to="/my-documents"
          className="card p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-200" />
            </div>
            <div>
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>Meus Documentos</h3>
              <p className="text-sm" style={{color: 'var(--text-muted)'}}>Histórico e status</p>
            </div>
          </div>
        </Link>

        <div className="card p-6 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600 dark:text-purple-200" />
            </div>
            <div>
              <h3 className="font-medium" style={{color: 'var(--text-primary)'}}>Segurança</h3>
              <p className="text-sm" style={{color: 'var(--text-muted)'}}>Assinatura GOV.BR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documentos recentes */}
      <div className="card rounded-lg shadow-sm">
        <div className="px-6 py-4" style={{borderBottom: '1px solid var(--border-primary)'}}>
          <h2 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Documentos Recentes</h2>
        </div>
        
        {recentDocuments.length === 0 ? (
          <div className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 mb-4" style={{color: 'var(--text-muted)'}} />
            <h3 className="text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>Nenhum documento encontrado</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>
              Comece enviando seu primeiro documento para assinatura.
            </p>
            <Link
              to="/upload"
              className="btn-primary inline-flex items-center px-4 py-2 rounded-md"
            >
              <Upload className="h-4 w-4 mr-2" />
              Enviar Documento
            </Link>
          </div>
        ) : (
          <div style={{borderTop: '1px solid var(--border-primary)'}}>
            {recentDocuments.map((doc) => (
              <div key={doc.id} className="px-6 py-4" style={{borderBottom: '1px solid var(--border-primary)'}}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                      <FileText className="h-4 w-4" style={{color: 'var(--text-secondary)'}} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{doc.title}</h3>
                      <p className="text-sm" style={{color: 'var(--text-muted)'}}>
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                    
                    {doc.status === 'pending' && (
                      <Link
                        to={`/sign/${doc.id}`}
                        className="inline-flex items-center text-sm hover:underline"
                        style={{color: 'var(--info)'}}
                        onMouseEnter={(e) => {
                          e.target.style.color = 'var(--border-focus)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.color = 'var(--info)';
                        }}
                      >
                        Assinar
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informações do usuário */}
      <div className="mt-8 card rounded-lg p-6" style={{background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)'}}>
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
            <Users className="h-6 w-6" style={{color: 'var(--info)'}} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
              Perfil: {getRoleDisplayName(user.role)}
            </h3>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              {user.email} • Sistema de Assinaturas Digitais
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
