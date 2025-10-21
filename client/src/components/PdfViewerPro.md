# PdfViewerPro

Um componente React TypeScript profissional para visualização de PDFs com funcionalidades avançadas de performance, navegação e interação.

## 🚀 Funcionalidades

- ✅ **Renderização de alta qualidade** com Device Pixel Ratio scaling
- ✅ **Fit-to-width automático** para melhor visualização
- ✅ **Zoom e rotação** com controles intuitivos
- ✅ **Thumbnails virtuais** com IntersectionObserver
- ✅ **Outline/Bookmarks** para navegação rápida
- ✅ **Busca com destaque** e navegação Next/Prev
- ✅ **Text layer** para seleção e cópia de texto
- ✅ **Cancelamento de renderização** para performance
- ✅ **Callbacks completos** para integração
- ✅ **TypeScript** com tipos completos

## 📦 Instalação

```bash
npm install pdfjs-dist
```

## 🎯 Uso Básico

```tsx
import React from 'react';
import PdfViewerPro from './components/PdfViewerPro';

function App() {
  return (
    <PdfViewerPro 
      url="https://example.com/document.pdf"
      width="100%"
      height="600px"
    />
  );
}
```

## 🎛️ Props

### Props Obrigatórias

| Prop | Tipo | Descrição |
|------|------|-----------|
| `url` | `string` | URL do arquivo PDF |

### Props Opcionais

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `width` | `number \| string` | `'100%'` | Largura do container |
| `height` | `number \| string` | `'600px'` | Altura do container |
| `initialScale` | `number \| 'auto'` | `'auto'` | Escala inicial (auto = fit-to-width) |
| `initialPage` | `number` | `1` | Página inicial |
| `showNavigation` | `boolean` | `true` | Mostrar controles de navegação |
| `showThumbnails` | `boolean` | `true` | Mostrar thumbnails das páginas |
| `showOutline` | `boolean` | `true` | Mostrar outline/bookmarks |
| `showSearch` | `boolean` | `true` | Mostrar funcionalidade de busca |
| `onPageRender` | `(pageNumber: number, canvas: HTMLCanvasElement) => void` | - | Callback quando página é renderizada |
| `onError` | `(error: Error) => void` | - | Callback quando ocorre erro |
| `onLoad` | `(pdf: PDFDocumentProxy) => void` | - | Callback quando PDF é carregado |
| `onPageChange` | `(pageNumber: number) => void` | - | Callback quando página muda |
| `className` | `string` | `''` | Classe CSS personalizada |

## 📋 Exemplos de Uso

### Exemplo Básico

```tsx
<PdfViewerPro 
  url="/documents/contract.pdf"
  height="800px"
/>
```

### Exemplo com Callbacks

```tsx
<PdfViewerPro 
  url="/documents/report.pdf"
  onLoad={(pdf) => {
    console.log(`PDF carregado: ${pdf.numPages} páginas`);
  }}
  onPageChange={(pageNumber) => {
    console.log(`Página atual: ${pageNumber}`);
  }}
  onError={(error) => {
    console.error('Erro ao carregar PDF:', error);
  }}
  onPageRender={(pageNumber, canvas) => {
    // Fazer algo com o canvas renderizado
    const imageData = canvas.toDataURL();
    localStorage.setItem(`page_${pageNumber}`, imageData);
  }}
/>
```

### Exemplo com Configurações Personalizadas

```tsx
<PdfViewerPro 
  url="/documents/manual.pdf"
  width={1200}
  height={900}
  initialPage={5}
  initialScale={1.5}
  showThumbnails={false}
  showSearch={true}
  className="my-custom-pdf-viewer"
/>
```

### Exemplo em Modal

```tsx
function PDFModal({ isOpen, onClose, pdfUrl }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <PdfViewerPro 
        url={pdfUrl}
        height="80vh"
        width="90vw"
        onError={(error) => {
          console.error('Erro no modal:', error);
          onClose();
        }}
      />
    </Modal>
  );
}
```

### Exemplo com Controle de Estado

```tsx
function PDFViewerWithState() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div>
      <div className="status-bar">
        Página {currentPage} de {totalPages}
        {isLoading && <span>Carregando...</span>}
      </div>
      
      <PdfViewerPro 
        url="/documents/document.pdf"
        onLoad={(pdf) => {
          setTotalPages(pdf.numPages);
          setIsLoading(false);
        }}
        onPageChange={setCurrentPage}
        onError={() => setIsLoading(false)}
      />
    </div>
  );
}
```

## 🎨 Personalização CSS

```css
/* Estilizar o container principal */
.pdf-viewer-pro {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

/* Personalizar controles */
.pdf-viewer-pro .controls {
  background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
  border-bottom: 1px solid #dee2e6;
}

/* Personalizar thumbnails */
.pdf-viewer-pro .thumbnail {
  transition: all 0.2s ease;
}

.pdf-viewer-pro .thumbnail:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* Personalizar busca */
.pdf-viewer-pro .search-highlight {
  background-color: yellow;
  opacity: 0.3;
  animation: highlight 2s ease-out;
}

@keyframes highlight {
  0% { opacity: 0.8; }
  100% { opacity: 0.3; }
}
```

## 🔧 Funcionalidades Técnicas

### Performance

- **Device Pixel Ratio Scaling**: Renderização em alta resolução para telas Retina
- **Cancelamento de Renderização**: Cancela renderizações anteriores ao mudar de página
- **IntersectionObserver**: Carrega thumbnails apenas quando visíveis
- **RequestAnimationFrame**: Animações suaves para transições

### Acessibilidade

- **Navegação por teclado**: Suporte completo a Tab e Enter
- **Screen readers**: Labels e roles apropriados
- **Contraste**: Cores adequadas para acessibilidade

### Responsividade

- **Mobile-first**: Funciona bem em dispositivos móveis
- **Touch events**: Suporte a gestos de toque
- **Flexible layout**: Adapta-se a diferentes tamanhos de tela

## 🧪 Testes

```bash
# Executar testes
npm test PdfViewerPro

# Executar testes com coverage
npm test -- --coverage PdfViewerPro
```

### Estrutura de Testes

- **Renderização básica**: Verifica se o componente renderiza corretamente
- **Callbacks**: Testa todos os callbacks de evento
- **Navegação**: Testa navegação entre páginas
- **Performance**: Testa cancelamento de renderização
- **Cálculos de viewport**: Testa cálculos de escala e viewport

## 🐛 Solução de Problemas

### PDF não carrega

```tsx
// Verificar se o worker está configurado
// Adicionar tratamento de erro
<PdfViewerPro 
  url="/path/to/pdf"
  onError={(error) => {
    console.error('Erro ao carregar PDF:', error);
    // Mostrar mensagem de erro para o usuário
  }}
/>
```

### Performance lenta

```tsx
// Desabilitar funcionalidades não essenciais
<PdfViewerPro 
  url="/large-pdf.pdf"
  showThumbnails={false}
  showOutline={false}
  initialScale={0.8} // Reduzir escala inicial
/>
```

### Text layer não aparece

```tsx
// Verificar se o PDF tem texto extraível
// Adicionar delay para carregamento
<PdfViewerPro 
  url="/scanned-pdf.pdf"
  onPageRender={(pageNumber, canvas) => {
    // Verificar se há texto na página
    console.log('Página renderizada:', pageNumber);
  }}
/>
```

## 📚 Dependências

- **pdfjs-dist**: ^3.11.174
- **React**: ^18.0.0
- **TypeScript**: ^4.9.0

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- [PDF.js](https://mozilla.github.io/pdf.js/) - Biblioteca de renderização de PDF
- [React](https://reactjs.org/) - Biblioteca de interface
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
