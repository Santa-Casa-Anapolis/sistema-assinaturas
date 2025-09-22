import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Upload, 
  Clock, 
  FileText, 
  LogOut, 
  User,
  Shield,
  Settings
} from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Enviar Documento', href: '/upload', icon: Upload },
    { name: 'Fluxo de Documentos', href: '/flow', icon: FileText },
    { name: 'Pendentes', href: '/pending', icon: Clock },
    { name: 'Meus Documentos', href: '/my-documents', icon: FileText },
  ];

  // Adicionar link de administração para diretores e admins
  if (user.role === 'diretoria' || user.role === 'admin') {
    navigation.push({ name: 'Administração', href: '/admin', icon: Settings });
  }

  // Adicionar link do painel de administração apenas para admins
  if (user.is_admin) {
    navigation.push({ name: 'Painel Admin', href: '/admin-panel', icon: Shield });
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Administrador',
      'operacional': 'Operacional',
      'supervisor': 'Supervisor',
      'contabilidade': 'Contabilidade',
      'financeiro': 'Financeiro',
      'diretoria': 'Diretoria'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'bg-indigo-100 text-indigo-800',
      'operacional': 'bg-green-100 text-green-800',
      'supervisor': 'bg-blue-100 text-blue-800',
      'contabilidade': 'bg-purple-100 text-purple-800',
      'financeiro': 'bg-yellow-100 text-yellow-800',
      'diretoria': 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Navegação */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                Sistema de Assinaturas
              </span>
            </div>

            {/* Navegação */}
            <nav className="hidden md:flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Informações do usuário */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navegação mobile */}
      <div className="md:hidden border-t">
        <nav className="flex space-x-8 px-4 py-2 overflow-x-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
