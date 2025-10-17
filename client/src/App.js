import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/dark-mode.css';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Hooks
import useInactivity from './hooks/useInactivity';

// Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UploadDocument from './components/UploadDocument';
import PendingSignatures from './components/PendingSignatures';
import DocumentSign from './components/DocumentSign';
import MyDocuments from './components/MyDocuments';
import AuditLog from './components/AuditLog';
import AdminConfig from './components/AdminConfig';
import AdminPanel from './components/AdminPanel';
import DocumentFlow from './components/DocumentFlow';
import Header from './components/Header';
import ThemeToggle from './components/ThemeToggle';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Admin Protected Route Component
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin' && !user.is_admin) return <Navigate to="/" />;
  return children;
};

// Componente wrapper para aplicar inatividade apenas quando logado
const AuthenticatedApp = ({ children }) => {
  const { user } = useAuth();
  
  // Aplicar hook de inatividade apenas se o usuário estiver logado
  const { showWarning, timeLeft, handleExtendSession, handleLogoutNow } = useInactivity(10); // 10 minutos de inatividade
  
  return (
    <>
      {children}
      {showWarning && (
        <InactivityWarning
          onExtend={handleExtendSession}
          onLogout={handleLogoutNow}
          timeLeft={timeLeft}
        />
      )}
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <ThemeToggle />
            <AuthenticatedApp>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                  <>
                    <Header />
                    <main className="container mx-auto px-4 py-8">
                      <Routes>
                        <Route path="/" element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } />
                        <Route path="/upload" element={
                          <ProtectedRoute>
                            <UploadDocument />
                          </ProtectedRoute>
                        } />
                        <Route path="/pending" element={
                          <ProtectedRoute>
                            <PendingSignatures />
                          </ProtectedRoute>
                        } />
                        <Route path="/my-documents" element={
                          <ProtectedRoute>
                            <MyDocuments />
                          </ProtectedRoute>
                        } />
                        <Route path="/sign/:id" element={
                          <ProtectedRoute>
                            <DocumentSign />
                          </ProtectedRoute>
                        } />
                        <Route path="/audit/:id" element={
                          <ProtectedRoute>
                            <AuditLog />
                          </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                          <ProtectedRoute>
                            <AdminConfig />
                          </ProtectedRoute>
                        } />
                        <Route path="/admin-panel" element={
                          <AdminRoute>
                            <AdminPanel />
                          </AdminRoute>
                        } />
                        <Route path="/flow" element={
                          <ProtectedRoute>
                            <DocumentFlow />
                          </ProtectedRoute>
                        } />
                      </Routes>
                    </main>
                  </>
                } />
              </Routes>
            </AuthenticatedApp>
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
