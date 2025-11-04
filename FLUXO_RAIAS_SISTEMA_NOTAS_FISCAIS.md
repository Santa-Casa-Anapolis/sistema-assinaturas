# 🔄 FLUXO EM RAIAS - SISTEMA DE NOTAS FISCAIS

## 📊 Diagrama de Fluxo em Raias (Swimlanes)

Este diagrama mostra o processo completo de aprovação de notas fiscais, identificando claramente as responsabilidades de cada ator envolvido no processo.

```mermaid
flowchart TB
    subgraph Fornecedor["👤 FORNECEDOR/SOLICITANTE"]
        A1[Recebe Nota Fiscal do Fornecedor]
        A2[Faz Upload do Documento no Sistema]
        A3[Define Fluxo de Assinaturas]
        A4[Acompanha Status do Documento]
        A5[Recebe Notificações de Aprovação/Reprovação]
        
        A1 --> A2
        A2 --> A3
        A3 --> A4
        A4 --> A5
    end
    
    subgraph Sistema["⚙️ SISTEMA"]
        B1[Valida Documento PDF/DOCX]
        B2[Salva em Temp_Documents]
        B3[Envia Email de Notificação]
        B4[Registra Assinatura Digital]
        B5[Move Arquivo entre Pastas]
        B6[Registra Auditoria]
        B7[Envia para Pasta de Rede Final]
        B8[Limpa Arquivos Temporários]
        
        B1 --> B2
        B2 --> B3
        B3 --> B4
        B4 --> B5
        B5 --> B6
        B6 --> B7
        B7 --> B8
    end
    
    subgraph Supervisor["👔 SUPERVISOR"]
        C1[Recebe Email de Notificação]
        C2[Acessa Link de Assinatura]
        C3[Visualiza Documento]
        C4[Revisa Conformidade]
        C5{Decisão}
        C6[Assina Digitalmente via GOV.BR]
        C7[Reprova e Justifica]
        
        C1 --> C2
        C2 --> C3
        C3 --> C4
        C4 --> C5
        C5 -->|Aprovado| C6
        C5 -->|Reprovado| C7
    end
    
    subgraph Contabilidade["📊 CONTABILIDADE"]
        D1[Recebe Documento Assinado]
        D2[Analisa Conformidade Fiscal]
        D3[Verifica Tributos]
        D4[Conferencia de Valores]
        D5[Verifica Centro de Custo]
        D6{Decisão}
        D7[Assina Digitalmente via GOV.BR]
        D8[Reprova e Justifica]
        
        D1 --> D2
        D2 --> D3
        D3 --> D4
        D4 --> D5
        D5 --> D6
        D6 -->|Aprovado| D7
        D6 -->|Reprovado| D8
    end
    
    subgraph Financeiro["💰 FINANCEIRO"]
        E1[Recebe Documento Aprovado]
        E2[Valida Informações Financeiras]
        E3[Verifica Orçamento]
        E4[Conferencia de Pagamento]
        E5[Verifica Prazo de Pagamento]
        E6{Decisão}
        E7[Assina Digitalmente via GOV.BR]
        E8[Processa Pagamento]
        E9[Reprova e Justifica]
        
        E1 --> E2
        E2 --> E3
        E3 --> E4
        E4 --> E5
        E5 --> E6
        E6 -->|Aprovado| E7
        E7 --> E8
        E6 -->|Reprovado| E9
    end
    
    subgraph Diretoria["🏢 DIRETORIA"]
        F1[Recebe Documento Final]
        F2[Revisão Executiva]
        F3[Verifica Políticas Empresariais]
        F4{Decisão Final}
        F5[Assina Digitalmente via GOV.BR]
        F6[Reprova e Justifica]
        
        F1 --> F2
        F2 --> F3
        F3 --> F4
        F4 -->|Aprovado| F5
        F4 -->|Reprovado| F6
    end
    
    %% Conexões entre Raias
    A2 --> B1
    A3 --> B2
    B3 --> C1
    C6 --> B4
    C7 --> B6
    B5 --> D1
    D7 --> B4
    D8 --> B6
    B5 --> E1
    E7 --> B4
    E8 --> B5
    E9 --> B6
    B5 --> F1
    F5 --> B4
    F6 --> B6
    B7 --> A5
    
    %% Estilos
    classDef fornecedor fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef sistema fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef supervisor fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef contabilidade fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef financeiro fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef diretoria fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef decisao fill:#ffebee,stroke:#c62828,stroke-width:3px
    
    class A1,A2,A3,A4,A5 fornecedor
    class B1,B2,B3,B4,B5,B6,B7,B8 sistema
    class C1,C2,C3,C4,C6,C7 supervisor
    class D1,D2,D3,D4,D5,D7,D8 contabilidade
    class E1,E2,E3,E4,E5,E7,E8,E9 financeiro
    class F1,F2,F3,F5,F6 diretoria
    class C5,D6,E6,F4 decisao
```

## 🔄 Fluxo Sequencial em Raias

```mermaid
sequenceDiagram
    participant F as 👤 Fornecedor
    participant S as ⚙️ Sistema
    participant Sup as 👔 Supervisor
    participant Cont as 📊 Contabilidade
    participant Fin as 💰 Financeiro
    participant Dir as 🏢 Diretoria
    participant REDE as 🌐 Pasta de Rede
    
    F->>S: 1. Upload Documento (PDF/DOCX)
    S->>S: 2. Valida e Salva em Temp_Documents
    F->>S: 3. Define Fluxo de Assinaturas
    S->>Sup: 4. Envia Email de Notificação
    
    Sup->>S: 5. Acessa Link de Assinatura
    Sup->>Sup: 6. Visualiza e Revisa Documento
    Sup->>S: 7. Assina via GOV.BR (Aprovado)
    S->>S: 8. Move para /uploads/pending/
    S->>Cont: 9. Envia Email de Notificação
    
    Cont->>S: 10. Acessa Documento
    Cont->>Cont: 11. Analisa Conformidade Fiscal
    Cont->>S: 12. Assina via GOV.BR (Aprovado)
    S->>S: 13. Move para /uploads/contabilidade/
    S->>Fin: 14. Envia Email de Notificação
    
    Fin->>S: 15. Acessa Documento
    Fin->>Fin: 16. Valida Informações Financeiras
    Fin->>S: 17. Assina via GOV.BR (Aprovado)
    S->>S: 18. Move para /uploads/financeiro/
    Fin->>S: 19. Processa Pagamento
    S->>S: 20. Move para /uploads/payment/
    S->>Dir: 21. Envia Email de Notificação
    
    Dir->>S: 22. Acessa Documento
    Dir->>Dir: 23. Revisão Executiva
    Dir->>S: 24. Assina via GOV.BR (Aprovado Final)
    S->>S: 25. Move para /uploads/diretoria/
    S->>S: 26. Move para /uploads/completed/
    S->>REDE: 27. Copia para Pasta de Rede Final
    S->>F: 28. Notificação de Conclusão
```

## 📋 Descrição Detalhada por Raia

### 👤 **FORNECEDOR/SOLICITANTE**

**Responsabilidades:**
- Receber nota fiscal do fornecedor externo
- Fazer upload do documento no sistema
- Definir o fluxo sequencial de assinaturas
- Acompanhar o status do documento
- Receber notificações sobre aprovações/reprovações

**Ações Principais:**
1. Upload de arquivo (PDF/DOCX, máximo 10MB)
2. Seleção de signatários na ordem correta
3. Monitoramento do progresso do documento

---

### ⚙️ **SISTEMA**

**Responsabilidades:**
- Validação de documentos
- Gerenciamento de arquivos
- Envio de notificações automáticas
- Registro de assinaturas digitais
- Movimentação de arquivos entre pastas
- Auditoria e logs
- Integração com GOV.BR
- Envio final para pasta de rede

**Pastas Utilizadas:**
- `/temp_documents/` - Upload temporário
- `/uploads/pending/` - Aguardando primeira aprovação
- `/uploads/contabilidade/` - Aprovado por contabilidade
- `/uploads/financeiro/` - Aprovado por financeiro
- `/uploads/diretoria/` - Aprovado por diretoria
- `/uploads/payment/` - Processamento de pagamento
- `/uploads/completed/` - Documento concluído
- `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\[SETOR]` - Pasta final de rede

---

### 👔 **SUPERVISOR**

**Responsabilidades:**
- Receber e revisar documento inicial
- Verificar conformidade básica
- Assinar digitalmente via GOV.BR
- Aprovar ou reprovar com justificativa

**Critérios de Aprovação:**
- Documento completo e legível
- Fornecedor válido
- Conformidade básica

**Tempo Médio:** 5-15 minutos

---

### 📊 **CONTABILIDADE**

**Responsabilidades:**
- Receber documento assinado pelo supervisor
- Analisar conformidade fiscal
- Verificar tributação correta
- Conferir valores e cálculos
- Validar centro de custo
- Assinar digitalmente via GOV.BR

**Critérios de Aprovação:**
- Tributos corretos
- Valores conferidos
- Centro de custo adequado
- Documentos complementares presentes

**Tempo Médio:** 15-30 minutos

---

### 💰 **FINANCEIRO**

**Responsabilidades:**
- Receber documento aprovado pela contabilidade
- Validar informações financeiras
- Verificar disponibilidade orçamentária
- Conferir prazo de pagamento
- Processar pagamento
- Assinar digitalmente via GOV.BR

**Critérios de Aprovação:**
- Dentro do orçamento
- Prazo de pagamento adequado
- Informações financeiras corretas

**Tempo Médio:** 15-30 minutos

---

### 🏢 **DIRETORIA**

**Responsabilidades:**
- Receber documento para aprovação final
- Revisão executiva
- Verificar conformidade com políticas empresariais
- Assinatura final via GOV.BR

**Critérios de Aprovação:**
- Conforme políticas internas
- Alinhado com estratégia empresarial

**Tempo Médio:** 30 minutos - 1 hora

---

## 🔀 Pontos de Decisão (Gateways)

### **1. Validação de Documento (Sistema)**
- ✅ Documento válido → Continua fluxo
- ❌ Documento inválido → Rejeição imediata

### **2. Aprovação Supervisor**
- ✅ Aprovado → Envia para Contabilidade
- ❌ Reprovado → Retorna para Fornecedor com justificativa

### **3. Aprovação Contabilidade**
- ✅ Aprovado → Envia para Financeiro
- ❌ Reprovado → Retorna para Fornecedor com justificativa

### **4. Aprovação Financeiro**
- ✅ Aprovado → Processa pagamento → Envia para Diretoria
- ❌ Reprovado → Retorna para Fornecedor com justificativa

### **5. Aprovação Diretoria**
- ✅ Aprovado → Finaliza e envia para pasta de rede
- ❌ Reprovado → Retorna para Fornecedor com justificativa

---

## 📊 Status do Documento no Fluxo

| Status | Descrição | Localização |
|--------|-----------|-------------|
| `temp_upload` | Upload temporário aguardando primeira assinatura | `/temp_documents/` |
| `pending` | Aguardando aprovação da contabilidade | `/uploads/pending/` |
| `contabilidade_approved` | Aprovado pela contabilidade | `/uploads/contabilidade/` |
| `financeiro_approved` | Aprovado pelo financeiro | `/uploads/financeiro/` |
| `payment_processed` | Pagamento processado | `/uploads/payment/` |
| `diretoria_approved` | Aprovado pela diretoria | `/uploads/diretoria/` |
| `completed` | Processo concluído | `/uploads/completed/` → Pasta de Rede |

---

## 🔐 Segurança e Auditoria

### **Registros de Auditoria:**
- ✅ Todas as ações são registradas com timestamp
- ✅ IP do dispositivo é capturado
- ✅ Usuário responsável é registrado
- ✅ Assinatura digital GOV.BR com validade jurídica
- ✅ Histórico completo disponível para consulta

### **Validações:**
- ✅ Tipo de arquivo (PDF/DOCX apenas)
- ✅ Tamanho máximo (10MB)
- ✅ Ordem sequencial obrigatória
- ✅ Usuário autorizado para cada etapa
- ✅ Verificação de permissões por role

---

## ⏱️ Tempo Total Estimado do Processo

| Etapa | Tempo Médio | Acumulado |
|-------|-------------|-----------|
| Upload e Configuração | 5 min | 5 min |
| Supervisor | 10 min | 15 min |
| Contabilidade | 20 min | 35 min |
| Financeiro | 20 min | 55 min |
| Diretoria | 30 min | **1h 25min** |

**Nota:** Tempos podem variar conforme complexidade do documento e urgência.

---

## 🎯 Benefícios do Fluxo em Raias

1. **Clareza de Responsabilidades:** Cada ator sabe exatamente o que deve fazer
2. **Rastreabilidade:** Fácil identificar onde o documento está em cada momento
3. **Eficiência:** Processo automatizado reduz tempo de aprovação
4. **Segurança:** Assinaturas digitais com validade jurídica
5. **Auditoria:** Histórico completo de todas as ações
6. **Padronização:** Processo uniforme para todos os documentos

---

**Versão:** 1.0  
**Data de criação:** Janeiro 2025  
**Uso:** Documentação do fluxo de aprovação de notas fiscais com raias

