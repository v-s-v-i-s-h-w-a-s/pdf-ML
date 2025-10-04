// frontend/app/components/PdfWrapper.tsx
'use client';
import dynamic from 'next/dynamic';
import React from 'react';

// Required definition for page.tsx and PdfWrapper.tsx
interface Element { 
    type: string; 
    bbox: number[]; 
    page: number; 
    confidence: number;
}
// NOTE: All problematic external CSS imports (react-pdf/dist/umd/...) 
// MUST BE REMOVED from this file and layout.tsx to pass the Vercel build.
// We rely on the dynamic loading (ssr: false) to prevent the failure.

// Dynamically import the PdfViewer component, forcing it to render only on the client (ssr: false).
// This is the CRITICAL STEP to bypass the server-side compilation of external CSS.
const DynamicPdfViewer = dynamic(
  () => 
    import('./PdfViewer').then((mod) => mod.PdfViewer),
  { 
    ssr: false, 
    loading: () => <p className="text-center p-4 text-gray-700 dark:text-gray-300">Loading PDF Viewer...</p> 
  }
);

interface PdfWrapperProps {
  file: File;
  elements: Element[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export const PdfWrapper: React.FC<PdfWrapperProps> = (props) => {
  // We can add a simple check here to try loading the CSS via a hook 
  // if necessary, but for deployment, the goal is to remove the build-breaking code.
  
  if (!props.file) return null;

  // Render the dynamically imported component with all props
  return <DynamicPdfViewer {...props} />;
};