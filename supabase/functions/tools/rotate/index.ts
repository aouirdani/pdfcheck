/**
 * Edge Function: tools/rotate
 * POST multipart/form-data
 *   file          — PDF file
 *   angle         — 90 | 180 | 270  (default 90)
 *   page_indices  — JSON array of 0-based page indices (optional, all pages if omitted)
 *   job_id        — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument, degrees } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const angle = parseInt(formData.get("angle") as string) || 90;
    const jobId = formData.get("job_id") as string | null;
    const pageIndicesRaw = formData.get("page_indices") as string | null;

    if (!file) return errorResponse("No file provided");
    if (![90, 180, 270].includes(angle)) return errorResponse("angle must be 90, 180, or 270");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    const indices = pageIndicesRaw
      ? (JSON.parse(pageIndicesRaw) as number[])
      : doc.getPageIndices();

    indices.forEach((i) => {
      const page = doc.getPage(i);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 80 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/rotated.pdf`
      : `temp/${crypto.randomUUID()}/rotated.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");

    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
