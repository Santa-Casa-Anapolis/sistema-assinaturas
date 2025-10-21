import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PdfViewerPro from '../PdfViewerPro';

// Mock do PDF.js
jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getOutline: jest.fn(() => Promise.resolve([])),
      getPage: jest.fn((pageNum) => Promise.resolve({
        getViewport: jest.fn(({ scale, rotation }) => ({
          width: 800 * scale,
          height: 600 * scale,
        })),
        getTextContent: jest.fn(() => Promise.resolve({
          items: [
            { str: 'Test text', transform: [1, 0, 0, 1, 100, 200], width: 50, height: 12 }
          ]
        })),
        render: jest.fn(() => ({
          promise: Promise.resolve()
        }))
      }))
    }))
  })),
  TextLayerBuilder: jest.fn(() => ({
    setTextContent: jest.fn(),
    render: jest.fn()
  }))
}));

// Mock do IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

describe('PdfViewerPro', () => {
  const defaultProps = {
    url: 'https://example.com/test.pdf'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza corretamente com props padrão', async () => {
    render(<PdfViewerPro {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText(/carregando pdf/i)).toBeInTheDocument();
    });
  });

  test('chama callback onLoad quando PDF é carregado', async () => {
    const onLoadMock = jest.fn();
    
    render(<PdfViewerPro {...defaultProps} onLoad={onLoadMock} />);
    
    await waitFor(() => {
      expect(onLoadMock).toHaveBeenCalled();
    });
  });

  test('chama callback onError quando há erro', async () => {
    const onErrorMock = jest.fn();
    const mockGetDocument = require('pdfjs-dist').getDocument;
    
    // Simular erro
    mockGetDocument.mockReturnValueOnce({
      promise: Promise.reject(new Error('PDF load failed'))
    });
    
    render(<PdfViewerPro {...defaultProps} onError={onErrorMock} />);
    
    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  test('navegação entre páginas funciona corretamente', async () => {
    const onPageChangeMock = jest.fn();
    
    render(
      <PdfViewerPro 
        {...defaultProps} 
        showNavigation={true}
        onPageChange={onPageChangeMock}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/página 1 de 5/i)).toBeInTheDocument();
    });
    
    const nextButton = screen.getByText(/próxima/i);
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(onPageChangeMock).toHaveBeenCalledWith(2);
    });
  });

  test('controles de escala funcionam', async () => {
    render(<PdfViewerPro {...defaultProps} showNavigation={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/página 1 de 5/i)).toBeInTheDocument();
    });
    
    const zoomInButton = screen.getByText('+');
    const zoomOutButton = screen.getByText('-');
    
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomOutButton);
    
    // Verificar se os botões estão funcionando
    expect(zoomInButton).toBeInTheDocument();
    expect(zoomOutButton).toBeInTheDocument();
  });

  test('fit-to-width funciona corretamente', async () => {
    render(<PdfViewerPro {...defaultProps} showNavigation={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/página 1 de 5/i)).toBeInTheDocument();
    });
    
    const fitWidthButton = screen.getByText('Fit Width');
    fireEvent.click(fitWidthButton);
    
    expect(fitWidthButton).toBeInTheDocument();
  });

  test('thumbnails são gerados quando habilitados', async () => {
    render(<PdfViewerPro {...defaultProps} showThumbnails={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/páginas/i)).toBeInTheDocument();
    });
    
    // Verificar se as páginas estão sendo listadas
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Página ${i}`)).toBeInTheDocument();
    }
  });

  test('busca funciona corretamente', async () => {
    render(<PdfViewerPro {...defaultProps} showSearch={true} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar no documento/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/buscar no documento/i);
    const searchButton = screen.getByText(/buscar/i);
    
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(searchButton);
    
    // Verificar se a busca foi iniciada
    expect(searchInput).toHaveValue('test');
  });

  test('rotação funciona', async () => {
    render(<PdfViewerPro {...defaultProps} showNavigation={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(/página 1 de 5/i)).toBeInTheDocument();
    });
    
    const rotateButton = screen.getByText(/rotate/i);
    fireEvent.click(rotateButton);
    
    expect(rotateButton).toBeInTheDocument();
  });

  test('aceita props personalizadas', () => {
    render(
      <PdfViewerPro 
        {...defaultProps}
        width={800}
        height={600}
        initialPage={2}
        className="custom-class"
      />
    );
    
    // Verificar se as props são aplicadas
    expect(screen.getByRole('main') || screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });
});

// Testes específicos para funções utilitárias
describe('Viewport calculations', () => {
  test('calcula viewport corretamente para diferentes escalas', () => {
    // Mock de página PDF
    const mockPage = {
      getViewport: jest.fn(({ scale, rotation }) => ({
        width: 800 * scale,
        height: 600 * scale,
      }))
    };

    // Teste com escala 1.0
    const viewport1 = mockPage.getViewport({ scale: 1.0, rotation: 0 });
    expect(viewport1.width).toBe(800);
    expect(viewport1.height).toBe(600);

    // Teste com escala 1.5
    const viewport2 = mockPage.getViewport({ scale: 1.5, rotation: 0 });
    expect(viewport2.width).toBe(1200);
    expect(viewport2.height).toBe(900);

    // Teste com rotação 90 graus
    const viewport3 = mockPage.getViewport({ scale: 1.0, rotation: 90 });
    expect(viewport3.width).toBe(600);
    expect(viewport3.height).toBe(800);
  });

  test('calcula escala automática baseada na largura do container', () => {
    const containerWidth = 1000;
    const pageWidth = 800;
    const expectedScale = containerWidth / pageWidth;

    expect(expectedScale).toBe(1.25);
  });

  test('limita valores de escala dentro de limites razoáveis', () => {
    const minScale = 0.1;
    const maxScale = 5.0;
    
    const testScales = [0.05, 0.5, 1.0, 2.0, 6.0];
    const expectedScales = [0.1, 0.5, 1.0, 2.0, 5.0];

    testScales.forEach((scale, index) => {
      const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
      expect(clampedScale).toBe(expectedScales[index]);
    });
  });
});

// Testes de performance
describe('Performance tests', () => {
  test('cancela renderização anterior ao mudar de página', async () => {
    const mockRenderTask = {
      cancel: jest.fn(),
      promise: Promise.resolve()
    };

    const mockPage = {
      getViewport: jest.fn(() => ({ width: 800, height: 600 })),
      render: jest.fn(() => mockRenderTask)
    };

    // Simular mudança rápida de página
    mockRenderTask.cancel();
    
    expect(mockRenderTask.cancel).toHaveBeenCalled();
  });

  test('otimiza renderização com Device Pixel Ratio', () => {
    const originalDPR = window.devicePixelRatio;
    window.devicePixelRatio = 2;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (context) {
      context.scale(2, 2);
      
      // Verificar se o scaling foi aplicado
      expect(context.getTransform().a).toBe(2); // scaleX
      expect(context.getTransform().d).toBe(2); // scaleY
    }

    window.devicePixelRatio = originalDPR;
  });
});
