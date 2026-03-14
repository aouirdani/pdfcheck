/**
 * Edge Function: tools/watermark
 * POST multipart/form-data
 *   file          — PDF file
 *   text          — watermark text (optional)
 *   image         — watermark image file (optional, PNG/JPG)
 *   opacity       — 0.0–1.0 (default 0.3)
 *   rotation      — degrees (default -45)
 *   position      — center | top-left | top-right | bottom-left | bottom-right
 *   font_size     — number (default 60)
 *   color_r/g/b   — 0-255 (default 128,128,128)
 *   pages         — JSON int[] of 0-based page indices (all if omitted)
 *   job_id        — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument, StandardFonts, rgb, degrees } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    const text = formData.get("text") as string | null;
    const imageFile = formData.get("image") as File | null;
    const opacity = parseFloat(formData.get("opacity") as string) || 0.3;
    const rotation = parseFloat(formData.get("rotation") as string) ?? -45;
    const position = (formData.get("position") as string) || "center";
    const fontSize = parseFloat(formData.get("font_size") as string) || 60;
    const cr = parseInt(formData.get("color_r") as string) || 128;
    const cg = parseInt(formData.get("color_g") as string) || 128;
    const cb = parseInt(formData.get("color_b") as string) || 128;
    const pagesRaw = formData.get("pages") as string | null;

    if (!text && !imageFile) return errorResponse("Provide either 'text' or 'image'");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);

    // Embed image if provided
    // deno-lint-ignore no-explicit-any
    let embeddedImage: any = null;
    if (imageFile) {
      const imgBytes = await imageFile.arrayBuffer();
      try {
        embeddedImage = await doc.embedPng(imgBytes);
      } catch {
        embeddedImage = await doc.embedJpg(imgBytes);
      }
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 40 });

    const indices = pagesRaw
      ? (JSON.parse(pagesRaw) as number[])
      : doc.getPageIndices();

    indices.forEach((i) => {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      let x = width / 2, y = height / 2;
      if (position === "top-left") { x = 80; y = height - 60; }
      else if (position === "top-right") { x = width - 80; y = height - 60; }
      else if (position === "bottom-left") { x = 80; y = 60; }
      else if (position === "bottom-right") { x = width - 80; y = 60; }

      if (embeddedImage) {
        const scale = Math.min((width * 0.4) / embeddedImage.width, (height * 0.4) / embeddedImage.height);
        const iw = embeddedImage.width * scale;
        const ih = embeddedImage.height * scale;
        page.drawImage(embeddedImage, {
          x: x - iw / 2, y: y - ih / 2,
          width: iw, height: ih,
          opacity,
          rotate: degrees(rotation),
        });
      } else if (text) {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: x - textWidth / 2,
          y: y - fontSize / 2,
          font,
          size: fontSize,
          color: rgb(cr / 255, cg / 255, cb / 255),
          opacity,
          rotate: degrees(rotation),
        });
      }
    });

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outBytes = await doc.save();
    const outputPath = jobId
      ? `jobs/${jobId}/watermarked.pdf`
      : `temp/${crypto.randomUUID()}/watermarked.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
