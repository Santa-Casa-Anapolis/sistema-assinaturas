const fs = require('fs');
const path = require('path');

console.log('🧪 TESTE - PASTA DE REDE (ESTRUTURA ANO/MÊS)');
console.log('=============================================');

// Caminho da pasta de rede
const networkPath = 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\NOTASFISCAIS';

// Verificar se a pasta existe
if (fs.existsSync(networkPath)) {
  console.log('✅ Pasta de rede encontrada:', networkPath);
  
  // Listar estrutura completa
  const sectors = fs.readdirSync(networkPath);
  console.log('\n📁 ESTRUTURA DE PASTAS:');
  
  sectors.forEach(sector => {
    const sectorPath = path.join(networkPath, sector);
    const sectorStats = fs.statSync(sectorPath);
    
    if (sectorStats.isDirectory()) {
      console.log(`\n📂 ${sector}:`);
      
      try {
        const years = fs.readdirSync(sectorPath);
        years.forEach(year => {
          const yearPath = path.join(sectorPath, year);
          const yearStats = fs.statSync(yearPath);
          
          if (yearStats.isDirectory()) {
            console.log(`   📅 ${year}:`);
            
            try {
              const months = fs.readdirSync(yearPath);
              months.forEach(month => {
                const monthPath = path.join(yearPath, month);
                const monthStats = fs.statSync(monthPath);
                
                if (monthStats.isDirectory()) {
                  const files = fs.readdirSync(monthPath);
                  console.log(`      📁 ${month} (${files.length} arquivos)`);
                  
                  if (files.length > 0) {
                    files.forEach(file => {
                      console.log(`         📄 ${file}`);
                    });
                  }
                }
              });
            } catch (error) {
              console.log(`      ❌ Erro ao ler meses: ${error.message}`);
            }
          }
        });
      } catch (error) {
        console.log(`   ❌ Erro ao ler anos: ${error.message}`);
      }
    }
  });
  
} else {
  console.log('❌ Pasta de rede não encontrada:', networkPath);
  console.log('💡 A pasta será criada automaticamente quando o primeiro documento for concluído');
}

// Mostrar estrutura esperada
console.log('\n📋 ESTRUTURA ESPERADA:');
console.log('Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\NOTASFISCAIS\\');
console.log('├── SETOR CONTABILIDADE\\');
console.log('│   └── 2025\\');
console.log('│       ├── JANEIRO\\');
console.log('│       ├── FEVEREIRO\\');
console.log('│       └── ...');
console.log('├── SETOR CENTRO DE IMAGEM\\');
console.log('│   └── 2025\\');
console.log('│       ├── JANEIRO\\');
console.log('│       ├── FEVEREIRO\\');
console.log('│       └── ...');
console.log('└── SETOR CENTRO MEDICO\\');
console.log('    └── 2025\\');
console.log('        ├── JANEIRO\\');
console.log('        ├── FEVEREIRO\\');
console.log('        └── ...');

console.log('\n🔧 PARA TESTAR:');
console.log('   1. Faça login com supervisor.contabilidade@empresa.com');
console.log('   2. Envie um documento');
console.log('   3. Complete todas as assinaturas');
console.log('   4. Verifique: SETOR CONTABILIDADE > 2025 > [MÊS ATUAL]');
