/**
 * Edge Function: tools/reorder
 * POST multipart/form-data
 *   file       — PDF file
 *   new_order  — JSON int[] of 0-based page indices in desired order
 *   job_id     — optional
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
    const newOrderRaw = formData.get("new_order") as string | null;
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");
    if (!newOrderRaw) return errorResponse("new_order is required");

    const newOrder = JSON.parse(newOrderRaw) as number[];

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, newOrder);
    pages.forEach((p) => out.addPage(p));

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 80 });

    const outBytes = await out.save();
    const outputPath = jobId
      ? `jobs/${jobId}/reordered.pdf`
      : `temp/${crypto.randomUUID()}/reordered.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
