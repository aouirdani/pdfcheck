/**
 * Edge Function: tools/merge
 * POST multipart/form-data
 *   files[]  — PDF files to merge
 *   job_id   — optional existing job id for progress tracking
 */
import { handleCors } from "../../_shared/cors.ts";
import { createAdminClient } from "../../_shared/supabase-client.ts";
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
    const files = formData.getAll("files[]") as File[];
    const jobId = formData.get("job_id") as string | null;

    if (!files.length) return errorResponse("No files provided");

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 5 });

    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      const bytes = await files[i].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
      if (jobId) {
        await updateJobStatus(jobId, "processing", {
          progress: Math.round(10 + (i / files.length) * 75),
        });
      }
    }

    if (jobId) await updateJobStatus(jobId, "processing", { progress: 90 });

    const outBytes = await merged.save();
    const outputPath = jobId
      ? `jobs/${jobId}/merged.pdf`
      : `temp/${crypto.randomUUID()}/merged.pdf`;

    const { signedUrl } = await uploadAndSign(outputPath, outBytes, "application/pdf");

    if (jobId) {
      await updateJobStatus(jobId, "done", {
        progress: 100,
        output_path: outputPath,
      });
    }

    return jsonResponse({ success: true, output_path: outputPath, download_url: signedUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
