/**
 * Edge Function: tools/page-numbers
 * POST multipart/form-data
 *   file        — PDF file
 *   position    — bottom-center | bottom-right | bottom-left | top-center  (default bottom-center)
 *   start_from  — integer (default 1)
 *   font_size   — number (default 11)
 *   prefix      — string prefix (default "")
 *   job_id      — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const position = (formData.get("position") as string) || "bottom-center";
    const startFrom = parseInt(formData.get("start_from") as string) || 1;
    const fontSize = parseFloat(formData.get("font_size") as string) || 11;
    const prefix = (formData.get("prefix") as string) || "";
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    doc.getPages().forEach((page, i) => {
      const { width, height } = page.getSize();
      const label = `${prefix}${i + startFrom}`;
      const textW = font.widthOfTextAtSize(label, fontSize);
      let x = width / 2 - textW / 2;
      let y = 20;
      if (position === "bottom-right") { x = width - textW - 20; y = 20; }
      else if (position === "bottom-left") { x = 20; y = 20; }
      else if (position === "top-center") { x = width / 2 - textW / 2; y = height - 30; }
      page.drawText(label, { x, y, font, size: fontSize, color: rgb(0.3, 0.3, 0.3) });
    });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 80 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/numbered.pdf`
      : `temp/${crypto.randomUUID()}/numbered.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
