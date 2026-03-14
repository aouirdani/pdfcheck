/**
 * Edge Function: tools/split
 * POST multipart/form-data
 *   file      — single PDF
 *   mode      — "range" | "every" | "extract"
 *   ranges    — JSON array of {from, to} (mode=range)
 *   n         — number (mode=every)
 *   pages     — JSON array of page numbers 1-indexed (mode=extract)
 *   job_id    — optional
 */
import { handleCors } from "../../_shared/cors.ts";
import {
  updateJobStatus,
  errorResponse,
  jsonResponse,
  uploadMultipleAndSign,
} from "../../_shared/job-helpers.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "every";
    const jobId = formData.get("job_id") as string | null;

    if (!file) return errorResponse("No file provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 5 });

    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    const total = src.getPageCount();

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 20 });

    let groups: number[][] = [];

    if (mode === "range") {
      const ranges = JSON.parse(formData.get("ranges") as string) as Array<{ from: number; to: number }>;
      groups = ranges.map(({ from, to }) => {
        const pages: number[] = [];
        for (let i = from - 1; i < Math.min(to, total); i++) pages.push(i);
        return pages;
      });
    } else if (mode === "every") {
      const n = parseInt(formData.get("n") as string) || 1;
      for (let start = 0; start < total; start += n) {
        const pages: number[] = [];
        for (let j = start; j < Math.min(start + n, total); j++) pages.push(j);
        groups.push(pages);
      }
    } else if (mode === "extract") {
      const pages = JSON.parse(formData.get("pages") as string) as number[];
      groups = pages.map((p) => [p - 1]);
    } else {
      // Default: split every page
      for (let i = 0; i < total; i++) groups.push([i]);
    }

    const outBuffers: Uint8Array[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (jobId) {
        await updateJobStatus(jobId, "processing", {
          progress: Math.round(20 + (i / groups.length) * 65),
        });
      }
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, groups[i]);
      copied.forEach((p) => out.addPage(p));
      outBuffers.push(await out.save());
    }

    const basePath = jobId ? `jobs/${jobId}` : `temp/${crypto.randomUUID()}`;
    const results = await uploadMultipleAndSign(basePath, outBuffers, "application/pdf");

    if (jobId) {
      await updateJobStatus(jobId, "done", {
        progress: 100,
        output_paths: results.map((r) => r.path),
      });
    }

    return jsonResponse({
      success: true,
      count: results.length,
      files: results.map((r, i) => ({
        index: i + 1,
        output_path: r.path,
        download_url: r.signedUrl,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
