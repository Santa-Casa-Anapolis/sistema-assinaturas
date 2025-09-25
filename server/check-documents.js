const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

async function checkDocuments() {
  try {
    console.log('🔍 Verificando documentos no banco de dados...');
    
    // Buscar todos os documentos
    const result = await pool.query(`
      SELECT id, title, filename, original_filename, signed_filename, file_path, signed_file_path, created_at
      FROM documents 
      ORDER BY id DESC
      LIMIT 20
    `);
    
    console.log(`📄 Encontrados ${result.rows.length} documentos`);
    console.log('');
    
    for (const doc of result.rows) {
      console.log(`📄 Documento ID: ${doc.id}`);
      console.log(`   Título: ${doc.title}`);
      console.log(`   Filename: ${doc.filename || 'NULL'}`);
      console.log(`   Original filename: ${doc.original_filename || 'NULL'}`);
      console.log(`   Signed filename: ${doc.signed_filename || 'NULL'}`);
      console.log(`   File path: ${doc.file_path || 'NULL'}`);
      console.log(`   Signed file path: ${doc.signed_file_path || 'NULL'}`);
      console.log(`   Criado em: ${doc.created_at}`);
      
      // Verificar arquivos físicos
      const uploadsDir = path.join(__dirname, 'uploads');
      const files = fs.readdirSync(uploadsDir);
      
      let foundFile = null;
      let foundPath = null;
      
      // Procurar por arquivo que contenha o ID do documento
      const documentId = doc.id.toString();
      const alternativeFile = files.find(file => 
        file.includes(documentId) || 
        file.includes(doc.original_filename?.replace(/\s+/g, '')) ||
        file.includes(doc.filename?.replace(/\s+/g, ''))
      );
      
      if (alternativeFile) {
        foundFile = alternativeFile;
        foundPath = path.join(uploadsDir, alternativeFile);
        console.log(`   ✅ Arquivo encontrado: ${foundFile}`);
        
        // Verificar se é PDF válido
        try {
          const fileBuffer = fs.readFileSync(foundPath);
          const header = fileBuffer.slice(0, 4).toString();
          
          if (header === '%PDF') {
            console.log(`   ✅ PDF válido`);
            
            // Sugerir correção no banco
            if (doc.filename !== foundFile) {
              console.log(`   🔧 SUGESTÃO: Atualizar filename para "${foundFile}"`);
              
              // Aplicar correção automaticamente
              await pool.query(`
                UPDATE documents 
                SET filename = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
              `, [foundFile, doc.id]);
              
              console.log(`   ✅ Correção aplicada automaticamente`);
            }
          } else {
            console.log(`   ❌ Arquivo não é PDF válido (cabeçalho: "${header}")`);
          }
        } catch (error) {
          console.log(`   ❌ Erro ao ler arquivo: ${error.message}`);
        }
      } else {
        console.log(`   ❌ Arquivo não encontrado`);
        
        // Listar alguns arquivos para debug
        console.log(`   📁 Arquivos disponíveis (primeiros 5):`, files.slice(0, 5));
      }
      
      console.log('');
    }
    
    console.log('✅ Verificação concluída');
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
  } finally {
    await pool.end();
  }
}

checkDocuments();
