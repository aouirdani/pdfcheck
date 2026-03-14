/**
 * Edge Function: tools/add-pages
 * POST multipart/form-data
 *   base_file      — the original PDF
 *   insert_files[] — PDFs to insert
 *   after_page     — 0-based page index to insert after (default: end)
 *   job_id         — optional
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
    const baseFile = formData.get("base_file") as File | null;
    const insertFiles = formData.getAll("insert_files[]") as File[];
    const afterPage = parseInt(formData.get("after_page") as string) || -1;
    const jobId = formData.get("job_id") as string | null;

    if (!baseFile) return errorResponse("base_file is required");
    if (!insertFiles.length) return errorResponse("insert_files[] is required");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 10 });

    const baseBytes = await baseFile.arrayBuffer();
    const base = await PDFDocument.load(baseBytes);

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 25 });

    // Collect all pages to insert
    const toInsert: ReturnType<typeof base.getPage>[] = [];
    for (const f of insertFiles) {
      const b = await f.arrayBuffer();
      const d = await PDFDocument.load(b);
      const copied = await base.copyPages(d, d.getPageIndices());
      toInsert.push(...copied);
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 65 });

    const insertAt = afterPage < 0 ? base.getPageCount() : Math.min(afterPage + 1, base.getPageCount());
    // Insert in reverse so indices stay correct
    [...toInsert].reverse().forEach((p) => base.insertPage(insertAt, p));

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 85 });

    const outBytes = await base.save();
    const outputPath = jobId
      ? `jobs/${jobId}/extended.pdf`
      : `temp/${crypto.randomUUID()}/extended.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");
    if (jobId) await updateJobStatus(jobId, "done", { progress: 100, output_path: outputPath });

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
