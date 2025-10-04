// frontend/app/components/MarkdownOutput.tsx
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; 
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import React from 'react'; // Keep React imported for component types

// NOTE: We have removed the unused CodeProps interface to resolve one of the final errors.

interface MarkdownOutputProps {
  markdown: string;
  file?: File | null;
  modelId?: string;
}

const MarkdownOutput = ({ markdown, file, modelId }: MarkdownOutputProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    alert('Markdown copied to clipboard!');
  };

  const handleDownload = async () => {
    if (!file || !modelId) {
      alert('No file or model selected.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/extract/${modelId}?download=true`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || 'Download failed');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(file.name || 'extracted').replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error', e);
      alert('Download failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-white dark:bg-gray-900 border-l dark:border-gray-700">
      <div className="flex justify-between items-center mb-4 border-b pb-2 dark:border-gray-700">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Extracted Markdown</h2>
    <div className="flex items-center space-x-2">
      <button 
        onClick={handleCopy} 
        className="p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Copy to Clipboard
      </button>
      <button 
        onClick={handleDownload} 
        className="p-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Download Markdown
      </button>
    </div>
      </div>
      
      {/* Render Markdown Content */}
      <article className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            code: ({ inline, className, children, ...rest }: any) => {
              
              const match = /language-(\w+)/.exec(className || '');
              
              return !inline && match ? (
                <SyntaxHighlighter
                  style={dark} 
                  language={match[1]}
                  PreTag="div"
                  {...rest} // Pass the rest of the props
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
            // Custom renderer for tables
            table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                    <table className="table-auto w-full border border-collapse border-gray-300 dark:border-gray-700">{children}</table>
                </div>
            )
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
};

export default MarkdownOutput;