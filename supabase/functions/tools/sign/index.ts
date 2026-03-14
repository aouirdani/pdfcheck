/**
 * Edge Function: tools/sign
 * POST multipart/form-data
 *   file            — PDF file
 *   signature       — PNG image of the signature
 *   page_index      — 0-based page index (default 0)
 *   x               — X position in PDF points (default 50)
 *   y               — Y position from top in PDF points (default 50)
 *   width           — signature width in points (default 200)
 *   height          — signature height in points (default 80)
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
    const signature = formData.get("signature") as File | null;
    const pageIndex = parseInt(formData.get("page_index") as string) || 0;
    const sigX = parseFloat(formData.get("x") as string) || 50;
    const sigY = parseFloat(formData.get("y") as string) || 50;
    const sigW = parseFloat(formData.get("width") as string) || 200;
    const sigH = parseFloat(formData.get("height") as string) || 80;
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");
    if (!signature) return errorResponse("signature image is required");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    const sigBytes = await signature.arrayBuffer();
    let img;
    try {
      img = await doc.embedPng(sigBytes);
    } catch {
      img = await doc.embedJpg(sigBytes);
    }

    const page = doc.getPage(pageIndex);
    const { height: pageH } = page.getSize();
    // Convert from top-origin to PDF bottom-origin
    page.drawImage(img, { x: sigX, y: pageH - sigY - sigH, width: sigW, height: sigH });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/signed.pdf`
      : `temp/${crypto.randomUUID()}/signed.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
