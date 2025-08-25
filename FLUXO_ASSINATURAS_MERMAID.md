# 🔄 Fluxo de Assinaturas - Diagrama BPMN

## 📊 Diagrama do Processo

```mermaid
flowchart TD
    A[Fornecedor Envia] --> B[Upload Documento]
    B --> C{Documento Válido?}
    C -->|Não| D[Rejeitar]
    C -->|Sim| E[Supervisor Assina]
    E --> F{Supervisor Aprovou?}
    F -->|Não| G[Rejeitar]
    F -->|Sim| H[Contabilidade Assina]
    H --> I{Contabilidade Aprovou?}
    I -->|Não| J[Rejeitar]
    I -->|Sim| K[Financeiro Assina]
    K --> L{Financeiro Aprovou?}
    L -->|Não| M[Rejeitar]
    L -->|Sim| N[Diretoria Assina]
    N --> O{Diretoria Aprovou?}
    O -->|Não| P[Rejeitar]
    O -->|Sim| Q[Mover para Rede]
    Q --> R[Registrar Auditoria]
    R --> S[Concluído]
```

## 🎯 Etapas do Processo

1. **Fornecedor** → Envia nota fiscal
2. **Supervisor** → Analisa e assina
3. **Contabilidade** → Analisa e assina  
4. **Financeiro** → Analisa e assina
5. **Diretoria** → Assinatura final
6. **Sistema** → Move para pasta e registra auditoria
