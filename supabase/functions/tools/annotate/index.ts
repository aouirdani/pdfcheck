/**
 * Edge Function: tools/annotate
 * Adds highlights and sticky notes to a PDF via annotations array.
 * POST multipart/form-data
 *   file         — PDF file
 *   annotations  — JSON: Array<{ type: "text"|"highlight", text?, x, y, pageIndex, fontSize?, color?:{r,g,b}, width?, height? }>
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

interface Annotation {
  type: "text" | "highlight" | "rect";
  text?: string;
  x: number;
  y: number;
  pageIndex: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  width?: number;
  height?: number;
  opacity?: number;
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

    const annotations = JSON.parse(annotationsRaw) as Annotation[];

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    for (const ann of annotations) {
      const page = doc.getPage(ann.pageIndex);
      const { height } = page.getSize();
      const c = ann.color ?? { r: 255, g: 213, b: 0 };

      if (ann.type === "highlight") {
        page.drawRectangle({
          x: ann.x,
          y: height - ann.y - (ann.height ?? 14),
          width: ann.width ?? 100,
          height: ann.height ?? 14,
          color: rgb(c.r / 255, c.g / 255, c.b / 255),
          opacity: ann.opacity ?? 0.35,
        });
      } else if (ann.type === "rect") {
        page.drawRectangle({
          x: ann.x,
          y: height - ann.y - (ann.height ?? 40),
          width: ann.width ?? 80,
          height: ann.height ?? 40,
          borderColor: rgb(c.r / 255, c.g / 255, c.b / 255),
          borderWidth: 1.5,
          opacity: ann.opacity ?? 0.8,
        });
      } else if (ann.type === "text" && ann.text) {
        page.drawText(ann.text, {
          x: ann.x,
          y: height - ann.y - (ann.fontSize ?? 12),
          font,
          size: ann.fontSize ?? 12,
          color: rgb(c.r / 255, c.g / 255, c.b / 255),
          opacity: ann.opacity ?? 1,
        });
      }
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/annotated.pdf`
      : `temp/${crypto.randomUUID()}/annotated.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
