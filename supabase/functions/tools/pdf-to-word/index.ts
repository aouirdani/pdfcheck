/**
 * Edge Function: tools/pdf-to-word
 * Proxies to CloudConvert API.
 * POST multipart/form-data
 *   file     — PDF file
 *   job_id   — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { cloudConvertFile } from "../../_shared/cloudconvert.ts";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 5 });

    const fileBytes = await file.arrayBuffer();
    if (jobId) await updateJobStatus(jobId, "processing", { progress: 15 });

    const result = await cloudConvertFile(fileBytes, file.name, "pdf", "docx");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 90 });

    const baseName = file.name.replace(/\.pdf$/i, "");
    const outputPath = jobId
      ? `jobs/${jobId}/${baseName}.docx`
      : `temp/${crypto.randomUUID()}/${baseName}.docx`;

    const { signedUrl } = await uploadAndSign(
      outputPath,
      result.bytes,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
