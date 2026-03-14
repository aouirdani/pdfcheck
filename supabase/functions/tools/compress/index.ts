/**
 * Edge Function: tools/compress
 * Proxies to CloudConvert API (free tier: 25 jobs/day).
 * Falls back to pdf-lib re-save optimisation if no API key is set.
 *
 * POST multipart/form-data
 *   file     — PDF file
 *   quality  — "low" | "medium" | "high"  (default "medium")
 *   job_id   — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const CC_API = "https://api.cloudconvert.com/v2";

async function compressViaCloudConvert(
  fileBytes: ArrayBuffer,
  filename: string,
  apiKey: string,
  quality: string
): Promise<Uint8Array> {
  // Build CloudConvert job
  const engineOptions =
    quality === "low"
      ? { pdfa: false, print_optimized: false }
      : quality === "high"
      ? { pdfa: false, print_optimized: true }
      : {};

  const jobRes = await fetch(`${CC_API}/jobs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tasks: {
        "upload-task": { operation: "import/upload" },
        "compress-task": {
          operation: "optimize/pdf",
          input: "upload-task",
          ...engineOptions,
        },
        "export-task": { operation: "export/url", input: "compress-task" },
      },
    }),
  });
  if (!jobRes.ok) throw new Error(`CloudConvert job create failed: ${jobRes.status}`);
  const jobData = await jobRes.json();
  const jobId = jobData.data.id;
  const uploadTask = jobData.data.tasks.find((t: { operation: string }) => t.operation === "import/upload");
  const uploadUrl = uploadTask?.result?.form?.url;

  // Upload file
  const form = new FormData();
  const uploadParams = uploadTask?.result?.form?.parameters ?? {};
  for (const [k, v] of Object.entries(uploadParams)) form.append(k, v as string);
  form.append("file", new Blob([fileBytes]), filename);
  await fetch(uploadUrl, { method: "POST", body: form });

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = await statusRes.json();
    if (status.data?.status === "error") throw new Error(status.data.message ?? "CloudConvert error");
    if (status.data?.status === "finished") {
      const exportTask = status.data.tasks?.find((t: { operation: string }) => t.operation === "export/url");
      const fileUrl = exportTask?.result?.files?.[0]?.url;
      if (!fileUrl) throw new Error("No output file URL from CloudConvert");
      const dlRes = await fetch(fileUrl);
      return new Uint8Array(await dlRes.arrayBuffer());
    }
  }
  throw new Error("CloudConvert compress timed out");
}

async function compressLocal(fileBytes: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(fileBytes, { updateMetadata: false });
  return await doc.save({ useObjectStreams: true, addDefaultPage: false });
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const quality = (formData.get("quality") as string) || "medium";
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 5 });

    const fileBytes = await file.arrayBuffer();
    const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 20 });

    let outBytes: Uint8Array;
    if (apiKey) {
      outBytes = await compressViaCloudConvert(fileBytes, file.name, apiKey, quality);
    } else {
      outBytes = await compressLocal(fileBytes);
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 90 });

    const originalSize = file.size;
    const compressedSize = outBytes.byteLength;
    const outputPath = jobId
      ? `jobs/${jobId}/compressed.pdf`
      : `temp/${crypto.randomUUID()}/compressed.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({
      success: true,
      original_size: originalSize,
      compressed_size: compressedSize,
      reduction_pct: Math.round((1 - compressedSize / originalSize) * 100),
      output_path: outputPath,
      download_url: signedUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
