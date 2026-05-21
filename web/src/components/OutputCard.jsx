import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import client from "../api/client";

export default function OutputCard({ output, documentId, onRegenerate, loading }) {
  const [copied, setCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(output || "");
  const [draftText, setDraftText] = useState(output || "");
  const [hasDownloaded, setHasDownloaded] = useState(false);

  // When a new result arrives, reset everything
  useEffect(() => {
    setEditedText(output || "");
    setDraftText(output || "");
    setIsEditing(false);
    setHasDownloaded(false);
  }, [output]);

  function startEditing() {
    setDraftText(editedText);
    setIsEditing(true);
  }

  function saveEdit() {
    setEditedText(draftText);
    setIsEditing(false);
  }

  function cancelEdit() {
    setDraftText(editedText);
    setIsEditing(false);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(editedText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadTxt() {
    const blob = new Blob([editedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output-${documentId?.slice(0, 8) || "document"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setHasDownloaded(true);
  }

  async function downloadPdf() {
    if (!documentId) return;
    setDownloadingPdf(true);
    try {
      const response = await client.get(`/documents/${documentId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `document-${documentId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setHasDownloaded(true);
    } catch (err) {
      console.error("Failed to download PDF", err);
      alert("Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  }

  if (!output) return null;

  const btnBase =
    "px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5";

  return (
    <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Generated Output</span>
          {isEditing && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Editing
            </span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button onClick={saveEdit} className={btnBase}>
                <Icon icon="lucide:check" className="h-3.5 w-3.5 text-green-600" />
                Done
              </button>
              <button onClick={cancelEdit} className={btnBase}>
                <Icon icon="lucide:x" className="h-3.5 w-3.5 text-gray-500" />
                Cancel
              </button>
            </>
          ) : (
            <>
              {documentId && onRegenerate && !hasDownloaded && (
                <button
                  onClick={() => onRegenerate(documentId)}
                  disabled={loading}
                  className={btnBase}
                >
                  <Icon icon="lucide:refresh-cw" className="h-3.5 w-3.5" />
                  {loading ? "Regenerating…" : "Regenerate"}
                </button>
              )}
              <button onClick={startEditing} className={btnBase}>
                <Icon icon="lucide:pencil" className="h-3.5 w-3.5" />
                Edit
              </button>
              {documentId && (
                <button onClick={downloadPdf} disabled={downloadingPdf} className={btnBase}>
                  <Icon icon="lucide:file-text" className="h-3.5 w-3.5" />
                  {downloadingPdf ? "Generating PDF…" : "Download PDF"}
                </button>
              )}
              <button onClick={downloadTxt} className={btnBase}>
                <Icon icon="lucide:download" className="h-3.5 w-3.5" />
                Download .txt
              </button>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white flex items-center gap-1.5"
                style={{ backgroundColor: "var(--brand-color, #2563eb)" }}
              >
                <Icon icon={copied ? "lucide:check" : "lucide:copy"} className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          className="w-full px-6 py-4 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 font-mono leading-relaxed resize-y focus:outline-none min-h-[300px]"
          style={{ minHeight: "300px" }}
        />
      ) : (
        <div className="px-6 py-4 prose prose-sm max-w-none text-gray-800 dark:text-gray-200">
          <ReactMarkdown>{editedText}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
