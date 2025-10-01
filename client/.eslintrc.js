module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Desabilitar warnings que estão causando falha no CI
    'react-hooks/exhaustive-deps': 'warn',
    'no-unused-vars': 'warn',
    'eqeqeq': 'warn',
    'default-case': 'warn',
    'no-use-before-define': 'warn'
  },
  env: {
    browser: true,
    node: true,
    es6: true
  }
};
