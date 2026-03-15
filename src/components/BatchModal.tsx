import { useRef, useState, useCallback } from "react";
import JSZip from "jszip";
import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";
import { processTool, type ProcessResult } from "../lib/tool-processor";
import { usePlan } from "../hooks/usePlan";

interface Props {
  tool: Tool;
  onClose: () => void;
}

type FileStatus = "pending" | "processing" | "done" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  progress: number;
  result: ProcessResult | null;
  errorMsg: string;
}

const MAX_FILES = 10;

// PDF tools that require PDF input (magic bytes check)
const PDF_INPUT_TOOLS = new Set([
  "split", "compress", "rotate", "reorder", "add-pages",
  "pdf-to-jpg", "pdf-to-word", "pdf-to-ppt", "pdf-to-excel",
  "edit-pdf", "watermark", "sign", "annotate", "protect", "unlock",
  "ocr", "page-numbers",
]);

async function checkIsPdf(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buf);
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  } catch {
    return false;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Status icon components
function StatusPending() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
  );
}

function StatusProcessing() {
  return (
    <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
      <svg
        className="w-5 h-5 text-red-500 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

function StatusDone() {
  return (
    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function StatusError() {
  return (
    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

export function BatchModal({ tool, onClose }: Props) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [processingStarted, setProcessingStarted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { plan, isPro, canUseTools, jobsToday } = usePlan();

  // Plan gate: only Starter and above
  const isFree = plan === null || plan === "free";

  const maxFileSizeBytes = isPro ? 1 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
  const maxFileSizeLabel = isPro ? "1 GB" : "100 MB";

  const doneCount = entries.filter((e) => e.status === "done").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const allFinished =
    entries.length > 0 &&
    entries.every((e) => e.status === "done" || e.status === "error");
  const hasResults = entries.some((e) => e.status === "done" && e.result !== null);

  // Validate incoming files
  const validateFiles = useCallback(
    async (incoming: File[]): Promise<string | null> => {
      const existingCount = entries.length;
      if (existingCount + incoming.length > MAX_FILES) {
        return `You can upload a maximum of ${MAX_FILES} files at once.`;
      }
      for (const file of incoming) {
        if (file.size > maxFileSizeBytes) {
          return `"${file.name}" exceeds the ${maxFileSizeLabel} file size limit.${
            isPro ? "" : " Upgrade to Pro for larger uploads."
          }`;
        }
        if (PDF_INPUT_TOOLS.has(tool.id)) {
          const isPdf = await checkIsPdf(file);
          if (!isPdf && file.name.toLowerCase().endsWith(".pdf")) {
            return `"${file.name}" does not appear to be a valid PDF file.`;
          }
        }
      }
      return null;
    },
    [entries.length, tool.id, maxFileSizeBytes, maxFileSizeLabel, isPro]
  );

  const addFiles = async (incoming: FileList | null) => {
    if (!incoming || isProcessing) return;
    const newFiles = Array.from(incoming);
    const error = await validateFiles(newFiles);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError("");
    const newEntries: FileEntry[] = newFiles.map((file) => ({
      file,
      status: "pending",
      progress: 0,
      result: null,
      errorMsg: "",
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validateFiles, isProcessing]
  );

  // Update a single entry immutably by index
  const updateEntry = (index: number, patch: Partial<FileEntry>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );
  };

  const handleProcessAll = async () => {
    if (!canUseTools) {
      window.dispatchEvent(
        new CustomEvent("open-upgrade", {
          detail: {
            reason: `You've used ${jobsToday}/5 free tools today. Upgrade for unlimited access.`,
          },
        })
      );
      return;
    }

    setIsProcessing(true);
    setProcessingStarted(true);

    // Reset all to pending before starting
    setEntries((prev) =>
      prev.map((e) => ({ ...e, status: "pending", progress: 0, result: null, errorMsg: "" }))
    );

    // Capture snapshot of current file list for processing
    const snapshot = entries.map((e, i) => ({ file: e.file, index: i }));

    // Process all files in parallel
    await Promise.all(
      snapshot.map(async ({ file, index }) => {
        updateEntry(index, { status: "processing", progress: 0 });
        try {
          const result = await processTool(
            tool.id,
            [file],
            {},
            (pct: number) => {
              updateEntry(index, { progress: Math.round(pct) });
            }
          );
          updateEntry(index, { status: "done", progress: 100, result });
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Processing failed.";
          updateEntry(index, { status: "error", progress: 0, errorMsg: msg });
        }
      })
    );

    setIsProcessing(false);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Collect all result blobs with sanitised filenames
      const usedNames = new Map<string, number>();

      for (const entry of entries) {
        if (entry.status !== "done" || !entry.result) continue;
        const res = entry.result;

        const dedup = (name: string): string => {
          const count = usedNames.get(name) ?? 0;
          usedNames.set(name, count + 1);
          if (count === 0) return name;
          const dot = name.lastIndexOf(".");
          return dot > -1
            ? `${name.slice(0, dot)}_${count}${name.slice(dot)}`
            : `${name}_${count}`;
        };

        if (res.isMultiple && res.blobs && res.blobs.length > 0) {
          // Multi-output tool (e.g. split, pdf-to-jpg) — add each blob
          res.blobs.forEach((blob, bi) => {
            const ext = res.mimeType === "image/jpeg" ? "jpg" : "pdf";
            const name = dedup(`${res.filename}_${bi + 1}.${ext}`);
            zip.file(name, blob);
          });
        } else if (res.blob) {
          const name = dedup(res.filename);
          zip.file(name, res.blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tool.id}-batch-results.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // Silent failure — user can retry
    } finally {
      setIsZipping(false);
    }
  };

  const handleReset = () => {
    setEntries([]);
    setValidationError("");
    setIsProcessing(false);
    setProcessingStarted(false);
  };

  // ── Free plan gate ──────────────────────────────────────────────────────────
  if (isFree) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className={`${tool.bg} px-6 py-5 flex items-center justify-between border-b ${tool.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                <ToolIcon icon={tool.icon} className={`w-5 h-5 ${tool.color}`} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">Batch Processing</h2>
                <p className="text-xs text-gray-500 mt-0.5">{tool.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition text-gray-500 hover:text-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-10 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-lg">Starter Plan Required</p>
              <p className="text-sm text-gray-500 mt-2 max-w-xs">
                Batch processing is available on Starter and higher plans. Upgrade to process up to {MAX_FILES} files at once and download them as a ZIP.
              </p>
            </div>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-upgrade", {
                    detail: { reason: "Batch processing requires a Starter or higher plan." },
                  })
                )
              }
              className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-full transition shadow-sm shadow-red-200 text-sm"
            >
              Upgrade to Starter
            </button>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main modal ──────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`${tool.bg} px-6 py-5 flex items-center justify-between border-b ${tool.border} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
              <ToolIcon icon={tool.icon} className={`w-5 h-5 ${tool.color}`} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">
                Batch {tool.title}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Process up to {MAX_FILES} files at once
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {processingStarted && entries.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">
                {doneCount + errorCount}/{entries.length} complete
                {errorCount > 0 && (
                  <span className="text-red-500 ml-1">({errorCount} failed)</span>
                )}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center transition text-gray-500 hover:text-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="px-6 py-6 overflow-y-auto flex-1">

          {/* Drop zone — hide once processing has started */}
          {!processingStarted && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isProcessing
                    ? "opacity-50 cursor-not-allowed border-gray-200"
                    : dragging
                    ? "border-red-400 bg-red-50 cursor-pointer"
                    : "border-gray-200 hover:border-red-300 hover:bg-gray-50 cursor-pointer"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${tool.bg} flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${tool.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {dragging ? "Drop your files here" : "Select files or drag & drop"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Up to {MAX_FILES} files · Max {maxFileSizeLabel} each
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-full transition shadow-sm shadow-red-200"
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    Select Files
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.html"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {validationError}
                </div>
              )}
            </>
          )}

          {/* File list */}
          {entries.length > 0 && (
            <div className={`space-y-2 ${!processingStarted ? "mt-4" : ""}`}>
              {entries.map((entry, i) => (
                <div
                  key={`${entry.file.name}-${i}`}
                  className={`flex flex-col gap-1.5 rounded-xl px-4 py-3 border transition-colors ${
                    entry.status === "done"
                      ? "bg-green-50 border-green-100"
                      : entry.status === "error"
                      ? "bg-red-50 border-red-100"
                      : entry.status === "processing"
                      ? "bg-blue-50 border-blue-100"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* File icon */}
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>

                    {/* Name + size */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{entry.file.name}</p>
                      <p className="text-xs text-gray-400">{formatSize(entry.file.size)}</p>
                    </div>

                    {/* Status icon / remove button */}
                    {!processingStarted ? (
                      <button
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <div className="flex-shrink-0">
                        {entry.status === "pending" && <StatusPending />}
                        {entry.status === "processing" && <StatusProcessing />}
                        {entry.status === "done" && <StatusDone />}
                        {entry.status === "error" && <StatusError />}
                      </div>
                    )}
                  </div>

                  {/* Progress bar — shown during/after processing */}
                  {processingStarted && (
                    <div className="pl-11">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            entry.status === "done"
                              ? "bg-green-500"
                              : entry.status === "error"
                              ? "bg-red-400"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${entry.status === "error" ? 100 : entry.progress}%` }}
                        />
                      </div>
                      {entry.status === "error" && entry.errorMsg && (
                        <p className="text-xs text-red-600 mt-1 truncate" title={entry.errorMsg}>
                          {entry.errorMsg}
                        </p>
                      )}
                      {entry.status === "processing" && (
                        <p className="text-xs text-gray-400 mt-1">{entry.progress}%</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Overall progress summary while processing */}
          {isProcessing && entries.length > 0 && (
            <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700">
                  Processing {entries.length} file{entries.length !== 1 ? "s" : ""}…
                </p>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${entries.length > 0 ? Math.round(((doneCount + errorCount) / entries.length) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold text-blue-700 flex-shrink-0">
                {doneCount + errorCount}/{entries.length}
              </span>
            </div>
          )}

          {/* All done summary */}
          {allFinished && !isProcessing && (
            <div className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 border ${
              errorCount === 0
                ? "bg-green-50 border-green-100"
                : errorCount === entries.length
                ? "bg-red-50 border-red-100"
                : "bg-amber-50 border-amber-100"
            }`}>
              {errorCount === 0 ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : errorCount === entries.length ? (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              )}
              <p className={`text-sm font-medium ${
                errorCount === 0
                  ? "text-green-700"
                  : errorCount === entries.length
                  ? "text-red-700"
                  : "text-amber-700"
              }`}>
                {errorCount === 0
                  ? `All ${doneCount} file${doneCount !== 1 ? "s" : ""} processed successfully.`
                  : errorCount === entries.length
                  ? "All files failed to process."
                  : `${doneCount} succeeded, ${errorCount} failed.`}
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-5 pt-2 flex-shrink-0 space-y-2">
          {/* Process All button */}
          {!allFinished && (
            <button
              disabled={entries.length === 0 || isProcessing}
              onClick={handleProcessAll}
              className={`w-full py-3 rounded-full font-semibold text-sm transition shadow-sm ${
                entries.length > 0 && !isProcessing
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isProcessing
                ? `Processing… (${doneCount + errorCount}/${entries.length})`
                : `Process All ${entries.length > 0 ? `(${entries.length})` : ""} →`}
            </button>
          )}

          {/* Download ZIP button */}
          {allFinished && hasResults && (
            <button
              disabled={isZipping}
              onClick={handleDownloadZip}
              className="w-full py-3 rounded-full font-semibold text-sm transition shadow-sm bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-green-200 flex items-center justify-center gap-2"
            >
              {isZipping ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Preparing ZIP…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download All as ZIP ({doneCount} file{doneCount !== 1 ? "s" : ""})
                </>
              )}
            </button>
          )}

          {/* Process new batch / reset */}
          {(allFinished || processingStarted) && (
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-full font-medium text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
            >
              Start a new batch
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Your files are protected with SSL encryption and deleted after 2 hours.
        </div>
      </div>
    </div>
  );
}
