/**
 * CloudConvert API client (free tier: 25 conversions/day)
 * Used for: PDF→Word, PDF→Excel, PDF→PPT, Word→PDF, Excel→PDF, PPT→PDF, HTML→PDF, Compress
 *
 * NOTE: In production the API key lives in the Supabase Edge Function (never exposed client-side).
 * For the demo/preview build we proxy through the edge function at /functions/v1/tools/<tool>
 * When VITE_CLOUDCONVERT_API_KEY is present we call the API directly (dev mode only).
 */

const CC_API = "https://api.cloudconvert.com/v2";

// Supabase Edge Function base (set in .env)
const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tools`
  : null;

export interface ConvertJobResult {
  url: string;
  filename: string;
  size: number;
}

async function pollJob(jobId: string, apiKey: string): Promise<ConvertJobResult> {
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();
    if (data.data?.status === "error") {
      throw new Error(data.data.message ?? "CloudConvert job failed");
    }
    if (data.data?.status === "finished") {
      const exportTask = data.data.tasks?.find(
        (t: { operation: string }) => t.operation === "export/url"
      );
      const file = exportTask?.result?.files?.[0];
      if (!file) throw new Error("No output file from CloudConvert");
      return { url: file.url, filename: file.filename, size: file.size };
    }
  }
  throw new Error("CloudConvert job timed out");
}

export async function cloudConvertFile(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  // If running through Supabase Edge Function proxy
  if (EDGE_BASE && !import.meta.env.VITE_CLOUDCONVERT_API_KEY) {
    return cloudConvertViaEdge(file, inputFormat, outputFormat, onProgress);
  }

  const apiKey = import.meta.env.VITE_CLOUDCONVERT_API_KEY;
  if (!apiKey) throw new Error("CloudConvert API key not configured");

  onProgress?.(5);

  // 1. Create job
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
  const job = await jobRes.json();
  const jobId: string = job.data.id;
  const uploadTask = job.data.tasks.find(
    (t: { operation: string }) => t.operation === "import/upload"
  );
  onProgress?.(15);

  // 2. Upload file
  const formData = new FormData();
  Object.entries(uploadTask.result.form.parameters as Record<string, string>).forEach(
    ([k, v]) => formData.append(k, v)
  );
  formData.append("file", file);
  await fetch(uploadTask.result.form.url, { method: "POST", body: formData });
  onProgress?.(40);

  // 3. Poll for result
  const result = await pollJob(jobId, apiKey);
  onProgress?.(85);

  // 4. Download output
  const blob = await fetch(result.url).then((r) => r.blob());
  onProgress?.(100);
  return blob;
}

async function cloudConvertViaEdge(
  file: File,
  inputFormat: string,
  outputFormat: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  if (!EDGE_BASE) throw new Error("Supabase URL not configured");
  onProgress?.(10);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("input_format", inputFormat);
  formData.append("output_format", outputFormat);

  const res = await fetch(`${EDGE_BASE}/convert`, {
    method: "POST",
    body: formData,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Edge function error: ${err}`);
  }
  onProgress?.(100);
  return res.blob();
}

// Convenience wrappers
export const convertPdfToWord = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "pdf", "docx", cb);

export const convertPdfToExcel = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "pdf", "xlsx", cb);

export const convertPdfToPpt = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "pdf", "pptx", cb);

export const convertWordToPdf = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "docx", "pdf", cb);

export const convertExcelToPdf = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "xlsx", "pdf", cb);

export const convertPptToPdf = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "pptx", "pdf", cb);

export const convertHtmlToPdf = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "html", "pdf", cb);

export const compressViaCloudConvert = (f: File, cb?: (p: number) => void) =>
  cloudConvertFile(f, "pdf", "pdf", cb);
