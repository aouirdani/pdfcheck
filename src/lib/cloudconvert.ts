/**
 * CloudConvert client
 *
 * Architecture:
 *  - In production (no VITE_CLOUDCONVERT_API_KEY): always proxies through the
 *    Supabase Edge Function at /functions/v1/tools/convert — API key stays server-side.
 *  - In local dev (VITE_CLOUDCONVERT_API_KEY set): calls CloudConvert directly from
 *    the browser for faster iteration.
 *
 * Supported conversions: PDF↔Word, PDF↔Excel, PDF↔PowerPoint, HTML→PDF
 */

const CC_API = "https://api.cloudconvert.com/v2";

const EDGE_CONVERT_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cloudconvert`
  : null;

export interface ConvertJobResult {
  url: string;
  filename: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

/** Extract the most descriptive error message from a CloudConvert API response */
function parseCCError(body: unknown): string {
  if (typeof body !== "object" || body === null) return String(body);
  const d = (body as any)?.data;
  // Task-level error (most specific)
  const tasks: any[] = d?.tasks ?? [];
  const failed = tasks.find((t: any) => t.status === "error");
  if (failed?.message) return failed.message;
  // Job-level message
  if (d?.message) return d.message;
  // Top-level message (e.g. 422 validation errors)
  const msg = (body as any)?.message;
  if (msg) return msg;
  return "CloudConvert job failed";
}

// ---------------------------------------------------------------------------
// Polling (direct API path)
// ---------------------------------------------------------------------------

async function pollJob(jobId: string, apiKey: string, onProgress?: (p: number) => void): Promise<ConvertJobResult> {
  const MAX = 60; // 60 × 2 s = 2 min
  for (let i = 0; i < MAX; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    // Simulate progress from 40 → 85 while waiting
    if (onProgress) onProgress(40 + Math.round((i / MAX) * 45));

    const res = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    // Transient HTTP errors — keep polling
    if (!res.ok) continue;

    const data = await res.json();
    const status: string = data?.data?.status;

    if (status === "error") {
      throw new Error(`CloudConvert conversion failed: ${parseCCError(data)}`);
    }

    if (status === "finished") {
      const tasks: any[] = data?.data?.tasks ?? [];
      const exportTask = tasks.find((t: any) => t.operation === "export/url");
      const file = exportTask?.result?.files?.[0];
      if (!file?.url) {
        throw new Error("CloudConvert finished but returned no output file");
      }
      return { url: file.url, filename: file.filename, size: file.size ?? 0 };
    }
  }
  throw new Error("CloudConvert job timed out (2 minutes)");
}

// ---------------------------------------------------------------------------
// Direct API path (dev only — uses VITE_CLOUDCONVERT_API_KEY)
// ---------------------------------------------------------------------------

async function cloudConvertDirect(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const apiKey = import.meta.env.VITE_CLOUDCONVERT_API_KEY;

  onProgress?.(5);

  // Step 1: Create job
  const jobRes = await fetch(`${CC_API}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "upload-task": { operation: "import/upload" },
        "convert-task": {
          operation: "convert",
          input: "upload-task",
          input_format: inputFormat,
          output_format: outputFormat,
        },
        "export-task": {
          operation: "export/url",
          input: "convert-task",
        },
      },
    }),
  });

  if (!jobRes.ok) {
    let body: unknown;
    try { body = await jobRes.json(); } catch { body = await jobRes.text(); }
    if (jobRes.status === 401) throw new Error("CloudConvert API key is invalid (401). Check VITE_CLOUDCONVERT_API_KEY.");
    if (jobRes.status === 402) throw new Error("CloudConvert free-tier quota exhausted (402). Upgrade your plan or wait until tomorrow.");
    throw new Error(`CloudConvert API error (${jobRes.status}): ${parseCCError(body)}`);
  }

  const jobData = await jobRes.json();
  const jobId: string | undefined = jobData?.data?.id;
  if (!jobId) throw new Error("CloudConvert returned no job ID");

  const tasks: any[] = jobData?.data?.tasks ?? [];
  const uploadTask = tasks.find((t: any) => t.operation === "import/upload");
  const uploadUrl: string | undefined = uploadTask?.result?.form?.url;
  if (!uploadUrl) throw new Error("CloudConvert: no upload URL returned for import/upload task");

  onProgress?.(15);

  // Step 2: Upload file
  const form = new FormData();
  const params: Record<string, string> = uploadTask?.result?.form?.parameters ?? {};
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  form.append("file", file);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error(`CloudConvert file upload failed (${uploadRes.status})`);
  }

  onProgress?.(40);

  // Step 3: Poll
  const result = await pollJob(jobId, apiKey, onProgress);
  onProgress?.(90);

  // Step 4: Download output
  const blob = await fetch(result.url).then((r) => {
    if (!r.ok) throw new Error(`Failed to download CloudConvert output (${r.status})`);
    return r.blob();
  });
  onProgress?.(100);
  return blob;
}

// ---------------------------------------------------------------------------
// Edge Function proxy path (production)
// ---------------------------------------------------------------------------

async function cloudConvertViaEdge(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  if (!EDGE_CONVERT_URL) {
    throw new Error("Supabase URL not configured (VITE_SUPABASE_URL missing)");
  }

  onProgress?.(10);

  const form = new FormData();
  form.append("file", file);
  form.append("input_format", inputFormat);
  form.append("output_format", outputFormat);

  const res = await fetch(EDGE_CONVERT_URL, {
    method: "POST",
    body: form,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    },
  });

  if (!res.ok) {
    let errMsg = `Edge function error (${res.status})`;
    try {
      const body = await res.json();
      errMsg = body?.error ?? errMsg;
    } catch {
      errMsg = `${errMsg}: ${await res.text().catch(() => "")}`;
    }
    throw new Error(errMsg);
  }

  onProgress?.(100);
  return res.blob();
}

// ---------------------------------------------------------------------------
// Public entry point — picks the right path automatically
// ---------------------------------------------------------------------------

export async function cloudConvertFile(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  // Use direct path only in dev when the key is explicitly provided
  if (import.meta.env.VITE_CLOUDCONVERT_API_KEY) {
    return cloudConvertDirect(file, inputFormat, outputFormat, onProgress);
  }
  // Production: always proxy through the edge function
  return cloudConvertViaEdge(file, inputFormat, outputFormat, onProgress);
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export const convertPdfToWord  = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "pdf",  "docx", cb);
export const convertPdfToExcel = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "pdf",  "xlsx", cb);
export const convertPdfToPpt   = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "pdf",  "pptx", cb);
export const convertWordToPdf  = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "docx", "pdf",  cb);
export const convertExcelToPdf = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "xlsx", "pdf",  cb);
export const convertPptToPdf   = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "pptx", "pdf",  cb);
export const convertHtmlToPdf  = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "html", "pdf",  cb);
export const compressViaCloudConvert = (f: File, cb?: (p: number) => void) => cloudConvertFile(f, "pdf", "pdf", cb);
