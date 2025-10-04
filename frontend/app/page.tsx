// frontend/app/page.tsx
'use client';
import { useState } from 'react';
import { UploadDropzone } from './components/UploadDropzone'; 
import { PdfWrapper } from './components/PdfWrapper';
import MarkdownOutput from "./components/MarkdownOutput";

import React from 'react';


// Required definition for page.tsx and PdfWrapper.tsx
interface Element { 
    type: string; 
    bbox: number[]; 
    page: number; 
    confidence: number;
}
// Dummy types based on backend schema
interface Element { type: string; bbox: number[]; page: number; }
interface ExtractionResult {
    markdown_output: string;
    elements: Element[];
    metrics: { time_s: number; elements_count: number; word_count: number; };
}

// NOTE: Use environment variable defined in .env.local and Vercel settings
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL; 

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [modelId, setModelId] = useState<string>('surya');
  const [results, setResults] = useState<ExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    if (!API_BASE_URL) {
        setError("API URL not configured. Check NEXT_PUBLIC_API_BASE_URL.");
        return;
    }

    setFile(uploadedFile);
    setResults(null);
    setError(null);
    setCurrentPage(1); // Reset page

    const formData = new FormData();
    formData.append('file', uploadedFile);

    setIsLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/extract/${modelId}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || `Extraction failed with status ${response.status}.`);
        }

        const data: ExtractionResult = await response.json();
        setResults(data);

    } catch (e: unknown) { // Change 'any' to 'unknown'
    // Handle the error type properly
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during extraction.';
    console.error("Fetch Error:", e);
    setError(errorMessage); // Use the cleaner error message
    setFile(null); 
} finally {
    setIsLoading(false);
}
  };

  if (!file || !results) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
            PDF Extraction Playground
        </h1>
        
        {/* Model Selection */}
        <div className="mb-8 w-full max-w-2xl p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <label htmlFor="model-select" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Extraction Model:
          </label>
          <select 
            id="model-select"
            value={modelId} 
            onChange={(e) => setModelId(e.target.value)} 
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="surya">Surya (Advanced Layout & OCR)</option>
            <option value="docling">Structural (Fast PDFMiner/Docling Simulation)</option>
            <option value="custom-ocr">LayoutParser + Tesseract (Custom OCR Pipeline)</option>
          </select>
        </div>

        {/* Upload Component */}
        <UploadDropzone onFileUpload={handleFileUpload} isLoading={isLoading} error={error} />
      </div>
    );
  }

  // Main Dual-Pane Display
  return (
    <div className="h-screen flex flex-col">
      {/* Header/Metrics Bar */}
      <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">PDF: {file.name}</h1>
        <div className="flex space-x-4 text-sm text-gray-700 dark:text-gray-300">
            <span>Model: **{modelId.toUpperCase()}**</span>
            <span>Time: {results.metrics.time_s.toFixed(2)}s</span>
            <span>Elements: {results.metrics.elements_count}</span>
        </div>
        <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">Clear File</button>
      </header>

      {/* Dual Pane Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Pane: PDF Viewer with Annotations */}
        <div className="w-1/2 h-full">
          <PdfWrapper 
            file={file} 
            elements={results.elements} 
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Right Pane: Extracted Markdown */}
        <div className="w-1/2 h-full">
          <MarkdownOutput markdown={results.markdown_output} file={file} modelId={modelId} />

        </div>
      </main>
    </div>
  );
}