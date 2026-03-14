/**
 * Edge Function: tools/protect
 * POST multipart/form-data
 *   file            — PDF file
 *   user_password   — password required to open the PDF
 *   owner_password  — password for full permissions (falls back to user_password)
 *   job_id          — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userPassword = formData.get("user_password") as string | null;
    const ownerPassword = (formData.get("owner_password") as string) || userPassword || "owner";
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");
    if (!userPassword) return errorResponse("user_password is required");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 50 });

    // pdf-lib encrypts via SaveOptions
    // deno-lint-ignore no-explicit-any
    const outBytes: Uint8Array = await (doc as any).save({ userPassword, ownerPassword });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outputPath = jobId
      ? `jobs/${jobId}/protected.pdf`
      : `temp/${crypto.randomUUID()}/protected.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
