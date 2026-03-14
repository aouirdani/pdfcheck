/**
 * Edge Function: tools/unlock
 * POST multipart/form-data
 *   file      — encrypted PDF
 *   password  — password to unlock
 *   job_id    — optional
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
    const password = (formData.get("password") as string) || "";
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    // deno-lint-ignore no-explicit-any
    const doc = await (PDFDocument as any).load(bytes, { password });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 70 });

    // Save without encryption
    const outBytes = await doc.save();

    const outputPath = jobId
      ? `jobs/${jobId}/unlocked.pdf`
      : `temp/${crypto.randomUUID()}/unlocked.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("password") || message.includes("Password") || message.includes("decrypt")) {
      return errorResponse("Incorrect password or file is not encrypted", 422);
    }
    return errorResponse(message, 500);
  }
});
