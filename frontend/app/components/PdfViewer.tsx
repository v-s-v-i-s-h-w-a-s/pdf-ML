// frontend/app/components/PdfViewer.tsx
'use client';
import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';


// Set up PDF.js worker with fallback options
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  // Prefer a local worker file served from /pdf.worker.min.js. The public file
  // will try to load a local node_modules copy or fallback to the CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

const COLOR_MAP: Record<string, string> = {
  title: 'border-red-500',
  header: 'border-blue-500',
  paragraph: 'border-green-500',
  table: 'border-purple-500',
  figure: 'border-yellow-500',
};

interface Element {
  type: string;
  bbox: number[]; // [x_min, y_min, x_max, y_max] (0-1000 normalized)
  page: number;
}

interface PdfViewerProps {
  file: File;
  elements: Element[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const PdfViewer = ({ file, elements, currentPage, onPageChange }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [renderText, setRenderText] = useState<boolean>(false); // disabled by default for speed

  // Create object URL from file
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      
      // Cleanup URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
    onPageChange(1);
    setLoadProgress(null);
  }
  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    console.error('File type:', file?.type);
    console.error('File size:', file?.size);
    console.error('Worker src:', pdfjs.GlobalWorkerOptions.workerSrc);
    
    let errorMessage = `Failed to load PDF file: ${error.message}`;
    
    // Provide more helpful error messages for common issues
    if (error.message.includes('Worker') || error.message.includes('worker')) {
      errorMessage = 'PDF worker failed to load. Please check your internet connection and try again.';
    } else if (error.message.includes('Invalid') || error.message.includes('corrupted')) {
      errorMessage = 'The PDF file appears to be corrupted or invalid.';
    }
    
    setError(errorMessage);
  }

  function onDocumentLoadProgress(progress: { loaded?: number; total?: number }) {
    try {
      if (!progress) return;
      const { loaded, total } = progress as any;
      if (loaded && total) {
        const pct = Math.min(100, Math.round((loaded / total) * 100));
        setLoadProgress(pct);
      }
    } catch (e) {
      // ignore progress errors
    }
  }

  const handleResize = useCallback((width: number) => {
    setPageWidth(width);
  }, []);

  const annotations = elements.filter(e => e.page === currentPage);

  // Don't render if no file URL is available
  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 dark:text-gray-300">Preparing PDF...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-auto bg-gray-100 dark:bg-gray-800">
      {error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600 dark:text-red-400">
            <p className="text-lg font-semibold mb-2">PDF Loading Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          onLoadProgress={onDocumentLoadProgress}
          loading={
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-600 dark:text-gray-300">Loading PDF...</p>
            </div>
          }
          className="mx-auto shadow-xl"
        >
        <div className="relative" ref={(el) => { if (el) handleResize(el.offsetWidth); }}>
          {numPages && (
            <Page 
              pageNumber={currentPage} 
              // Disable the annotation/text layers by default (they are expensive).
              renderAnnotationLayer={renderText} 
              renderTextLayer={renderText} 
              width={pageWidth > 0 ? pageWidth : undefined}
            />
          )}
          
          {/* Custom Bounding Box Overlays */}
          {pageWidth > 0 && annotations.map((el, index) => {
            // Denormalize bbox from 0-1000 to actual pixel coordinates
            const [x_min, y_min, x_max, y_max] = el.bbox.map(c => (c * pageWidth) / 1000);
            
            const height = y_max - y_min;
            const width = x_max - x_min;

            return (
              <div
                key={index}
                className={`absolute border-2 opacity-50 hover:opacity-100 transition-opacity ${COLOR_MAP[el.type] || 'border-gray-500'}`}
                style={{
                  left: x_min,
                  top: y_min,
                  width: width,
                  height: height,
                  zIndex: 10,
                  pointerEvents: 'none', 
                }}
                title={`Type: ${el.type}`}
              />
            );
          })}
        </div>
      </Document>
      )}

      {/* Loading progress */}
      {loadProgress !== null && (
        <div className="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 p-2 rounded shadow">
          <div className="text-sm">Loading: {loadProgress}%</div>
        </div>
      )}

      {/* Toggle to enable text/annotation layers when needed */}
      <div className="absolute top-4 left-4">
        <label className="inline-flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 p-2 rounded">
          <input type="checkbox" checked={renderText} onChange={(e) => setRenderText(e.target.checked)} />
          <span className="text-sm">Render text/annotations (slower)</span>
        </label>
      </div>
      
      {/* Page Navigation Controls */}
      {numPages && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-2 flex justify-center space-x-4 border-t dark:border-gray-700">
            <button 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
                disabled={currentPage <= 1}
                className="p-1 border rounded disabled:opacity-50"
            >
                Prev
            </button>
            <span>Page {currentPage} of {numPages}</span>
            <button 
                onClick={() => onPageChange(Math.min(numPages, currentPage + 1))} 
                disabled={currentPage >= numPages}
                className="p-1 border rounded disabled:opacity-50"
            >
                Next
            </button>
        </div>
      )}
    </div>
  );
};