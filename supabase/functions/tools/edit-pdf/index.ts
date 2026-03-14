/**
 * Edge Function: tools/edit-pdf
 * Adds text annotations to a PDF.
 * POST multipart/form-data
 *   file         — PDF file
 *   annotations  — JSON array of { text, x, y, pageIndex, fontSize, color: {r,g,b} }
 *   job_id       — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

interface TextAnnotation {
  text: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize: number;
  color: { r: number; g: number; b: number };
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const annotationsRaw = formData.get("annotations") as string | null;
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");
    if (!annotationsRaw) return errorResponse("annotations JSON is required");

    const annotations = JSON.parse(annotationsRaw) as TextAnnotation[];

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    for (const ann of annotations) {
      const page = doc.getPage(ann.pageIndex);
      const { height } = page.getSize();
      page.drawText(ann.text, {
        x: ann.x,
        y: height - ann.y - ann.fontSize,
        font,
        size: ann.fontSize,
        color: rgb(ann.color.r / 255, ann.color.g / 255, ann.color.b / 255),
      });
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/edited.pdf`
      : `temp/${crypto.randomUUID()}/edited.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
