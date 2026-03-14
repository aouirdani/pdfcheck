import { createAdminClient } from "./supabase-client.ts";
import { corsHeaders } from "./cors.ts";

type JobStatus = "pending" | "processing" | "done" | "error";

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates: {
    progress?: number;
    output_path?: string;
    output_paths?: string[];
    error_message?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (updates.progress !== undefined) payload.progress = updates.progress;
  if (updates.output_path !== undefined) payload.output_path = updates.output_path;
  if (updates.output_paths !== undefined) payload.output_paths = updates.output_paths;
  if (updates.error_message !== undefined) payload.error_message = updates.error_message;
  if (updates.metadata !== undefined) payload.metadata = updates.metadata;

  const { error } = await admin.from("jobs").update(payload).eq("id", jobId);
  if (error) {
    console.error(`Failed to update job ${jobId}:`, error.message);
  }
}

export async function createJob(
  tool: string,
  userId: string | null,
  inputPaths: string[],
  metadata: Record<string, unknown> = {}
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .insert({
      tool,
      user_id: userId,
      status: "pending",
      progress: 0,
      input_paths: inputPaths,
      metadata,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create job: ${error.message}`);
  return data.id as string;
}

export async function getJobById(jobId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Upload a Uint8Array to Supabase Storage and return signed URL */
export async function uploadAndSign(
  path: string,
  bytes: Uint8Array,
  contentType: string,
  expiresIn = 3600
): Promise<{ path: string; signedUrl: string }> {
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("pdf-files")
    .upload(path, bytes, { contentType, upsert: true });
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

  const { data: signedData, error: signErr } = await admin.storage
    .from("pdf-files")
    .createSignedUrl(path, expiresIn);
  if (signErr || !signedData) throw new Error(`Failed to create signed URL: ${signErr?.message}`);

  return { path, signedUrl: signedData.signedUrl };
}

/** Upload multiple blobs and return signed URLs */
export async function uploadMultipleAndSign(
  basePath: string,
  buffers: Uint8Array[],
  contentType: string,
  expiresIn = 3600
): Promise<Array<{ path: string; signedUrl: string }>> {
  const results: Array<{ path: string; signedUrl: string }> = [];
  for (let i = 0; i < buffers.length; i++) {
    const p = `${basePath}/part_${i + 1}.pdf`;
    const r = await uploadAndSign(p, buffers[i], contentType, expiresIn);
    results.push(r);
  }
  return results;
}
