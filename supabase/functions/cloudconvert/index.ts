/**
 * Edge Function: tools/convert
 * Universal CloudConvert proxy — handles any input/output format pair.
 *
 * POST multipart/form-data
 *   file          — the source file
 *   input_format  — e.g. "pdf", "docx", "xlsx", "pptx", "html"
 *   output_format — e.g. "docx", "xlsx", "pptx", "pdf"
 *
 * Returns the converted file as a binary response with correct Content-Type.
 */
import { handleCors, corsHeaders } from "../_shared/cors.ts";
import { cloudConvertFile } from "../_shared/cloudconvert.ts";

const MIME_MAP: Record<string, string> = {
  pdf:  "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  html: "text/html",
  txt:  "text/plain",
  png:  "image/png",
  jpg:  "image/jpeg",
};

Deno.serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const inputFormat = (formData.get("input_format") as string | null)?.toLowerCase().trim();
    const outputFormat = (formData.get("output_format") as string | null)?.toLowerCase().trim();

    if (!file) {
      return errorRes("No file provided");
    }
    if (!inputFormat || !outputFormat) {
      return errorRes("input_format and output_format are required");
    }

    const fileBytes = await file.arrayBuffer();

    const result = await cloudConvertFile(
      fileBytes,
      file.name,
      inputFormat,
      outputFormat
    );

    const contentType = MIME_MAP[outputFormat] ?? "application/octet-stream";

    return new Response(result.bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-File-Size": String(result.size),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[tools/convert] error:", message);
    return errorRes(message, 500);
  }
});

function errorRes(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
