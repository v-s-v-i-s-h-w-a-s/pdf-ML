// frontend/app/components/UploadDropzone.tsx
'use client';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface UploadDropzoneProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileUpload, isLoading, error }) => {
  const [fileName, setFileName] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // NOTE: Using window.alert for simplicity as per HTML/React guidelines
      if (file.type !== 'application/pdf') {
        alert("Please upload a PDF file.");
        return;
      }
      setFileName(file.name);
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-16 text-center transition-colors cursor-pointer 
          ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`
        }
      >
        <input {...getInputProps()} />
        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
          {isDragActive 
            ? "Drop the PDF here..." 
            : "Drag and drop a PDF file here, or click to select file"
          }
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          (Max file size: 10MB)
        </p>
      </div>

      <div className="mt-4 text-center">
        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span>Processing &apos;{fileName}&apos; (Estimated 3-7s)...</span>
          </div>
        )}
        {error && (
          <p className="text-red-500 mt-2 font-medium">Error: {error}</p>
        )}
      </div>
    </div>
  );
};