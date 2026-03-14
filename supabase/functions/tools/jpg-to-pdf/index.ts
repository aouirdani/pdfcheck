/**
 * Edge Function: tools/jpg-to-pdf
 * POST multipart/form-data
 *   images[]    — JPG/PNG image files
 *   page_size   — A4 | Letter | fit  (default A4)
 *   orientation — portrait | landscape (default portrait)
 *   margin      — number in points (default 20)
 *   job_id      — optional
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
    const images = formData.getAll("images[]") as File[];
    const pageSize = (formData.get("page_size") as string) || "A4";
    const orientation = (formData.get("orientation") as string) || "portrait";
    const margin = parseFloat(formData.get("margin") as string) || 20;
    const jobId = formData.get("job_id") as string | null;

    if (!images.length) return errorResponse("No images provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 5 });

    const sizes: Record<string, [number, number]> = {
      A4: [595.28, 841.89],
      Letter: [612, 792],
    };

    const doc = await PDFDocument.create();

    for (let i = 0; i < images.length; i++) {
      if (jobId) {
        await updateJobStatus(jobId, "processing", {
          progress: Math.round(5 + (i / images.length) * 85),
        });
      }

      const bytes = await images[i].arrayBuffer();
      const mime = images[i].type;

      let img;
      if (mime === "image/png") {
        img = await doc.embedPng(bytes);
      } else {
        img = await doc.embedJpg(bytes);
      }

      let pw: number, ph: number;
      if (pageSize === "fit") {
        pw = img.width;
        ph = img.height;
      } else {
        const [bw, bh] = sizes[pageSize] ?? sizes["A4"];
        [pw, ph] = orientation === "landscape" ? [bh, bw] : [bw, bh];
      }

      const page = doc.addPage([pw, ph]);
      const usableW = pw - margin * 2;
      const usableH = ph - margin * 2;
      const scale = Math.min(usableW / img.width, usableH / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      page.drawImage(img, {
        x: margin + (usableW - iw) / 2,
        y: margin + (usableH - ih) / 2,
        width: iw,
        height: ih,
      });
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 95 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/images.pdf`
      : `temp/${crypto.randomUUID()}/images.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
