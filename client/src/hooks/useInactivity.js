import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import InactivityWarning from '../components/InactivityWarning';

const useInactivity = (timeoutMinutes = 10) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const isWarningShown = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const resetTimer = () => {
    // Limpar timers existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    
    // Resetar flag de aviso
    isWarningShown.current = false;

    // Configurar aviso 1 minuto antes do logout
    const warningTime = (timeoutMinutes - 1) * 60 * 1000; // 9 minutos
    warningTimeoutRef.current = setTimeout(() => {
      if (!isWarningShown.current) {
        isWarningShown.current = true;
        setShowWarning(true);
        setTimeLeft(60);
        
        // Contador regressivo
        const countdown = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, warningTime);

    // Configurar logout automático
    const logoutTime = timeoutMinutes * 60 * 1000; // 10 minutos
    timeoutRef.current = setTimeout(() => {
      console.log('🔐 Logout automático por inatividade');
      toast.info('Sessão encerrada por inatividade. Faça login novamente.');
      logout();
    }, logoutTime);
  };

  const handleActivity = () => {
    // Se o aviso foi mostrado, esconder e resetar
    if (isWarningShown.current) {
      setShowWarning(false);
      isWarningShown.current = false;
    }
    
    resetTimer();
  };

  const handleExtendSession = () => {
    setShowWarning(false);
    isWarningShown.current = false;
    resetTimer();
    toast.success('Sessão estendida com sucesso!');
  };

  const handleLogoutNow = () => {
    setShowWarning(false);
    logout();
  };

  useEffect(() => {
    // Não aplicar inatividade se não estiver logado ou estiver na tela de login
    if (!user || location.pathname === '/login') {
      return;
    }

    // Eventos que indicam atividade do usuário
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Adicionar listeners para todos os eventos
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Iniciar o timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [timeoutMinutes, user, location.pathname]);

  return {
    resetTimer: handleActivity,
    showWarning,
    timeLeft,
    handleExtendSession,
    handleLogoutNow
  };
};

export default useInactivity;
