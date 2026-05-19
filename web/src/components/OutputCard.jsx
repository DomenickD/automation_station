import ReactMarkdown from "react-markdown";
import { useState } from "react";

export default function OutputCard({ output, documentId, onRegenerate, loading }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadTxt() {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output-${documentId?.slice(0, 8) || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!output) return null;

  return (
    <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Generated Output</span>
        <div className="flex gap-2">
          {documentId && onRegenerate && (
            <button
              onClick={() => onRegenerate(documentId)}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Regenerating..." : "Regenerate"}
            </button>
          )}
          <button
            onClick={downloadTxt}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Download .txt
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div className="px-6 py-4 prose prose-sm max-w-none text-gray-800 dark:text-gray-200">
        <ReactMarkdown>{output}</ReactMarkdown>
      </div>
    </div>
  );
}
