import { useRef, useState, useCallback } from "react";
import { Tool } from "../data/tools";
import { ToolIcon } from "./ToolIcon";
import { processTool, triggerDownload, type ProcessResult } from "../lib/tool-processor";
import { createJob, updateJob } from "../lib/jobs";
import type { JobTool } from "../lib/database.types";

interface Props {
  tool: Tool;
  onClose: () => void;
}

type Step = "upload" | "processing" | "done" | "error";

export function ToolModal({ tool, onClose }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => [...prev, ...Array.from(incoming)]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleProcess = async () => {
    setStep("processing");
    setProgress(0);
    setErrorMsg("");
    setResult(null);

    // Create a job record in Supabase (best-effort — don't block on failure)
    let jobId: string | null = null;
    try {
      const job = await createJob({
        tool: tool.id as JobTool,
        inputPaths: files.map((f) => f.name),
        metadata: { fileCount: files.length },
      });
      jobId = job.id;
    } catch {
      // Job tracking optional — continue even if it fails
    }

    try {
      const res = await processTool(tool.id, files, {}, (pct) =>
        setProgress(Math.round(pct))
      );
      setResult(res);
      setStep("done");

      // Mark job as done
      if (jobId) {
        await updateJob(jobId, {
          status: "done",
          progress: 100,
          output_path: res.filename,
        }).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Processing failed. Please try again.";
      setErrorMsg(msg);
      setStep("error");

      if (jobId) {
        await updateJob(jobId, {
          status: "error",
          error_message: msg,
        }).catch(() => {});
      }
    }
  };

  const handleDownload = () => {
    if (result) triggerDownload(result);
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setProgress(0);
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`${tool.bg} px-6 py-5 flex items-center justify-between border-b ${tool.border}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
              <ToolIcon icon={tool.icon} className={`w-5 h-5 ${tool.color}`} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">{tool.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{tool.category}</p>
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

        <div className="px-6 py-6">
          {step === "upload" && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragging
                    ? `border-red-400 bg-red-50`
                    : "border-gray-200 hover:border-red-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center`}>
                    <svg className={`w-7 h-7 ${tool.color}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {dragging ? "Drop your files here" : "Select files or drag & drop"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PDF files supported · Up to 100MB</p>
                  </div>
                  <button
                    type="button"
                    className={`bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-5 py-2 rounded-full transition shadow-sm shadow-red-200`}
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
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                disabled={files.length === 0}
                onClick={handleProcess}
                className={`mt-5 w-full py-3 rounded-full font-semibold text-sm transition shadow-sm ${
                  files.length > 0
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {tool.title} →
              </button>
            </>
          )}

          {step === "processing" && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl ${tool.bg} flex items-center justify-center`}>
                <ToolIcon icon={tool.icon} className={`w-8 h-8 ${tool.color} animate-pulse`} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Processing your file…</p>
                <p className="text-xs text-gray-400 mt-1">This usually takes a few seconds</p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-gray-600">{Math.min(progress, 100)}%</p>
            </div>
          )}

          {step === "done" && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">Done!</p>
                <p className="text-sm text-gray-500 mt-1">
                  {result?.isMultiple
                    ? `${result.blobs?.length ?? 0} files ready to download`
                    : "Your file has been processed successfully."}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-full transition shadow-sm shadow-green-200 text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download {result?.filename ?? "File"}
              </button>
              <button onClick={handleReset} className="text-sm text-gray-400 hover:text-gray-600 transition">
                Process another file
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">Something went wrong</p>
                <p className="text-sm text-red-500 mt-1 max-w-xs">{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-8 py-3 rounded-full transition text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Your files are protected with SSL encryption and deleted after 2 hours.
        </div>
      </div>
    </div>
  );
}
