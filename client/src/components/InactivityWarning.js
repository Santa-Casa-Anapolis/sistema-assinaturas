import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';

const InactivityWarning = ({ onExtend, onLogout, timeLeft }) => {
  const [seconds, setSeconds] = useState(timeLeft);

  useEffect(() => {
    setSeconds(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setTimeout(() => {
        setSeconds(seconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [seconds]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const secsRemaining = secs % 60;
    return `${mins}:${secsRemaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            Sessão Expirando
          </h3>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            Você será desconectado automaticamente em:
          </p>
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 text-red-500 mr-2" />
            <span className="text-2xl font-bold text-red-600">
              {formatTime(seconds)}
            </span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onExtend}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continuar Sessão
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Sair Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;
