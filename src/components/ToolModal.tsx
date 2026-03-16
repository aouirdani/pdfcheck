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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

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
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
          transition: "opacity 300ms", opacity: visible ? 1 : 0,
        }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div style={{
        position: "relative",
        background: "var(--white)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        maxWidth: 400,
        borderLeft: "var(--border)",
        transition: "transform 300ms ease-out",
        transform: visible ? "translateX(0)" : "translateX(100%)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36,
              border: "var(--border)",
              borderRadius: "var(--radius)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--red)",
            }}>
              <ToolIcon icon={tool.icon} size={20} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--black)" }}>{tool.title}</p>
              <p style={{ fontSize: 12, color: "var(--gray-400)" }}>{tool.category}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, border: "var(--border)",
              borderRadius: "var(--radius)", background: "var(--white)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--gray-400)",
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Usage warning */}
              {!isPro && canUseTools && remainingToday <= 2 && remainingToday !== Infinity && (
                <div style={{
                  padding: "12px 16px", border: "1px solid #FCD34D",
                  borderRadius: "var(--radius)", background: "#FFFBEB",
                  fontSize: 13, color: "#92400E",
                }}>
                  {remainingToday} free tool{remainingToday === 1 ? "" : "s"} remaining today
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: dragging ? `2px dashed var(--red)` : `2px dashed var(--gray-200)`,
                  borderRadius: "var(--radius)",
                  padding: "40px 24px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragging ? "var(--red-subtle)" : "var(--white)",
                  transition: "border-color var(--transition), background var(--transition)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 48, height: 48, border: "var(--border)",
                    borderRadius: "var(--radius)", background: "var(--white)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--red)",
                  }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--black)", marginBottom: 4 }}>
                      {dragging ? "Drop your files here" : "Drag & drop or click to upload"}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--gray-400)" }}>
                      Up to {maxFileSizeLabel} · PDF and Office formats
                    </p>
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  style={{ display: "none" }}
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* Validation error */}
              {validationError && (
                <div style={{
                  padding: "12px 16px", border: "1px solid var(--red)",
                  borderRadius: "var(--radius)", background: "var(--red-subtle)",
                  fontSize: 13, color: "var(--red)",
                }}>
                  {validationError}
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gray-400)" }}>
                    <span>{files.length} file{files.length > 1 ? "s" : ""} selected</span>
                    <span>{fileSizeLabel}</span>
                  </div>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", border: "var(--border)",
                      borderRadius: "var(--radius)", background: "var(--gray-50)",
                    }}>
                      <div style={{
                        width: 32, height: 32, border: "var(--border)",
                        borderRadius: "var(--radius)", background: "var(--white)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--red)", flexShrink: 0,
                      }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--black)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                        <p style={{ fontSize: 11, color: "var(--gray-400)" }}>{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        style={{ color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 48, paddingBottom: 48 }}>
              <div style={{
                width: 64, height: 64, border: "var(--border)",
                borderRadius: "var(--radius)", background: "var(--white)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--red)",
              }}>
                <ToolIcon icon={tool.icon} size={28} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--black)", marginBottom: 4 }}>Processing…</p>
                <p style={{ fontSize: 13, color: "var(--gray-400)" }}>This usually takes a few seconds</p>
              </div>
              <div style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gray-400)", marginBottom: 8 }}>
                  <span>Progress</span>
                  <span style={{ fontWeight: 600, color: "var(--black)" }}>{Math.min(progress, 100)}%</span>
                </div>
                <div style={{ width: "100%", height: 4, background: "var(--gray-100)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", background: "var(--red)",
                    borderRadius: 2, transition: "width 300ms ease",
                    width: `${Math.min(progress, 100)}%`,
                  }} />
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 48, paddingBottom: 48 }}>
              <div style={{
                width: 64, height: 64, border: "var(--border)",
                borderRadius: "var(--radius)", background: "var(--white)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--black)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--black)", marginBottom: 8 }}>Done!</p>
                <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
                  {result?.isMultiple
                    ? `${result.blobs?.length ?? 0} files ready to download`
                    : `${result?.filename ?? "Your file"} is ready`}
                </p>
              </div>
              <button
                onClick={() => result && triggerDownload(result)}
                style={{
                  width: "100%", padding: "14px 24px",
                  background: "var(--black)", color: "var(--white)",
                  border: "none", borderRadius: "var(--radius)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download {result?.filename ?? "File"}
              </button>
              <button
                onClick={handleReset}
                style={{ fontSize: 13, color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer" }}
              >
                Process another file →
              </button>
            </div>
          )}

          {step === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, paddingTop: 48, paddingBottom: 48 }}>
              <div style={{
                width: 64, height: 64, border: "1px solid var(--red)",
                borderRadius: "var(--radius)", background: "var(--red-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--red)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--black)", marginBottom: 8 }}>Something went wrong</p>
                <p style={{ fontSize: 13, color: "var(--red)", maxWidth: 280, lineHeight: 1.5 }}>{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                style={{
                  padding: "12px 32px", background: "var(--black)", color: "var(--white)",
                  border: "none", borderRadius: "var(--radius)",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "upload" && (
          <div style={{
            padding: "16px 24px", borderTop: "var(--border)",
            background: "var(--gray-50)", flexShrink: 0,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <button
              disabled={files.length === 0}
              onClick={handleProcess}
              style={{
                width: "100%", padding: "13px 24px",
                background: files.length > 0 ? "var(--red)" : "var(--gray-100)",
                color: files.length > 0 ? "#fff" : "var(--gray-400)",
                border: "none", borderRadius: "var(--radius)",
                fontSize: 14, fontWeight: 600,
                cursor: files.length > 0 ? "pointer" : "not-allowed",
                transition: "background var(--transition)",
              }}
            >
              {files.length > 0 ? `${tool.title} →` : "Select files to continue"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--gray-400)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
