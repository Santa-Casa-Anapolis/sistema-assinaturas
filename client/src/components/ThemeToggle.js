import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Sun, 
  Moon 
} from 'lucide-react';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button 
      className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
      onClick={toggleTheme}
      title={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-label={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      <div className="theme-toggle-icon">
        {isDarkMode ? (
          <Sun size={20} />
        ) : (
          <Moon size={20} />
        )}
      </div>
      <span className="theme-toggle-text">
        {isDarkMode ? 'Claro' : 'Escuro'}
      </span>
    </button>
  );
};

export default ThemeToggle;
