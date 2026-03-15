import { useRef, useState, useCallback, useEffect } from "react";
import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";
import { processTool, triggerDownload, type ProcessResult } from "../lib/tool-processor";
import { createJob, updateJob } from "../lib/jobs";
import { toast } from "../lib/toast";
import { usePlan } from "../hooks/usePlan";
import type { JobTool } from "../lib/database.types";

interface Props {
  tool: Tool;
  onClose: () => void;
}

type Step = "upload" | "processing" | "done" | "error";

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
  } catch { return false; }
}

export function ToolModal({ tool, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [validationError, setValidationError] = useState("");
  const [visible, setVisible] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isPro, canUseTools, jobsToday, remainingToday, refetch } = usePlan();
  const maxFileSizeBytes = isPro ? 1 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
  const maxFileSizeLabel = isPro ? "1 GB" : "100 MB";

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const validateFiles = useCallback(async (incoming: File[]): Promise<string | null> => {
    for (const file of incoming) {
      if (file.size > maxFileSizeBytes) {
        return `"${file.name}" exceeds the ${maxFileSizeLabel} limit. ${isPro ? "" : "Upgrade for larger files."}`;
      }
      if (PDF_INPUT_TOOLS.has(tool.id)) {
        const isPdf = await checkIsPdf(file);
        if (!isPdf && file.name.endsWith(".pdf")) {
          return `"${file.name}" doesn't appear to be a valid PDF file.`;
        }
      }
    }
    return null;
  }, [tool.id, maxFileSizeBytes, maxFileSizeLabel, isPro]);

  const handleFiles = async (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    const error = await validateFiles(newFiles);
    if (error) { setValidationError(error); return; }
    setValidationError("");
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validateFiles]);

  const startProgressSimulation = () => {
    setProgress(0);
    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      const increment = Math.max(0.5, (90 - current) * 0.04);
      current = Math.min(90, current + increment);
      setProgress(Math.round(current));
      if (current >= 90) { clearInterval(progressIntervalRef.current!); progressIntervalRef.current = null; }
    }, 150);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleProcess = async () => {
    if (!canUseTools) {
      window.dispatchEvent(new CustomEvent("open-upgrade", {
        detail: { reason: `You've used all ${jobsToday} free tools today. Upgrade for unlimited access.` },
      }));
      return;
    }
    setStep("processing");
    setErrorMsg("");
    setResult(null);
    startProgressSimulation();

    let jobId: string | null = null;
    try {
      const job = await createJob({ tool: tool.id as JobTool, inputPaths: files.map((f) => f.name), metadata: { fileCount: files.length } });
      jobId = job.id;
    } catch { /* optional */ }

    try {
      const res = await processTool(tool.id, files, {}, (pct) => {
        setProgress((prev) => Math.max(prev, Math.round(pct * 0.9)));
      });
      stopProgressSimulation();
      setProgress(100);
      setResult(res);
      setStep("done");
      toast("File processed successfully!", "success");

      let blobUrl: string | undefined;
      if (res.blob) blobUrl = URL.createObjectURL(res.blob);
      else if (res.blobs?.length) blobUrl = URL.createObjectURL(res.blobs[0]);

      if (jobId) {
        await updateJob(jobId, { status: "done", progress: 100, output_path: res.filename, metadata: { fileCount: files.length, blobUrl } }).catch(() => {});
      }
      refetch();
    } catch (err: unknown) {
      stopProgressSimulation();
      const msg = err instanceof Error ? err.message : "Processing failed. Please try again.";
      setErrorMsg(msg);
      setStep("error");
      toast(msg, "error");
      if (jobId) await updateJob(jobId, { status: "error", error_message: msg }).catch(() => {});
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setProgress(0);
    setResult(null);
    setErrorMsg("");
    setValidationError("");
  };

  const fileSize = files.reduce((sum, f) => sum + f.size, 0);
  const fileSizeLabel = fileSize > 1024 * 1024
    ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
    : `${(fileSize / 1024).toFixed(1)} KB`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />

      {/* Side drawer */}
      <div className={`relative bg-white dark:bg-gray-950 flex flex-col h-full sm:h-screen w-full sm:max-w-md shadow-2xl dark:shadow-black/60 transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className={`${tool.bg} dark:opacity-90 px-6 py-5 border-b ${tool.border} dark:border-opacity-30`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <ToolIcon icon={tool.icon} className={`w-5 h-5 ${tool.color}`} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base">{tool.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{tool.category}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white flex items-center justify-center transition text-gray-500 hover:text-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "upload" && (
            <div className="space-y-4">
              {/* Usage warning */}
              {!isPro && canUseTools && remainingToday <= 2 && remainingToday !== Infinity && (
                <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {remainingToday} free tool{remainingToday === 1 ? "" : "s"} remaining today
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragging
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]"
                    : "border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl ${tool.bg} flex items-center justify-center`}>
                    <svg className={`w-8 h-8 ${tool.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {dragging ? "Drop your files here" : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Up to {maxFileSizeLabel} · PDF and Office formats
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition shadow-md shadow-indigo-200/40 dark:shadow-indigo-900/40"
                    onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  >
                    Choose Files
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* Validation error */}
              {validationError && (
                <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {validationError}
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                    <span>{files.length} file{files.length > 1 ? "s" : ""} selected</span>
                    <span>{fileSizeLabel}</span>
                  </div>
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="relative">
                <div className={`w-20 h-20 rounded-3xl ${tool.bg} flex items-center justify-center`}>
                  <ToolIcon icon={tool.icon} className={`w-10 h-10 ${tool.color} animate-pulse`} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">Processing…</p>
                <p className="text-sm text-gray-400 mt-1">This usually takes a few seconds</p>
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Progress</span>
                  <span className="font-semibold text-indigo-600">{Math.min(progress, 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse-glow">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xl">All done! 🎉</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                  {result?.isMultiple
                    ? `${result.blobs?.length ?? 0} files ready to download`
                    : `${result?.filename ?? "Your file"} is ready`}
                </p>
              </div>

              <button
                onClick={() => result && triggerDownload(result)}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white font-bold px-8 py-4 rounded-2xl transition shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/40 flex items-center justify-center gap-2.5 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download {result?.filename ?? "File"}
              </button>

              <button onClick={handleReset} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
                Process another file →
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-xl">Something went wrong</p>
                <p className="text-sm text-red-500 mt-2 max-w-xs leading-relaxed">{errorMsg}</p>
              </div>
              <button onClick={handleReset}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition text-sm">
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "upload" && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
            <button
              disabled={files.length === 0}
              onClick={handleProcess}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
                files.length > 0
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-200/40 dark:shadow-indigo-900/40 hover:-translate-y-0.5"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              }`}
            >
              {files.length > 0 ? `${tool.title} →` : "Select files to continue"}
            </button>
            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              SSL encrypted · Auto-deleted after 2 hours
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
