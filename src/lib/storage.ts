/**
 * Supabase Storage helpers
 * Bucket: "pdf-files" (created in Supabase dashboard)
 * Structure: {userId}/{jobId}/{filename}
 */
import { supabase } from "./supabase";

const BUCKET = "pdf-files";

export async function uploadFile(
  file: File,
  path: string
): Promise<{ path: string; signedUrl: string }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: signedData, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (signErr || !signedData) throw new Error(`Signed URL failed: ${signErr?.message}`);

  return { path, signedUrl: signedData.signedUrl };
}

export async function uploadBlob(
  blob: Blob,
  path: string,
  contentType = "application/pdf"
): Promise<{ path: string; signedUrl: string }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: signedData, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (signErr || !signedData) throw new Error(`Signed URL failed: ${signErr?.message}`);

  return { path, signedUrl: signedData.signedUrl };
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data) throw new Error(`Failed to get signed URL: ${error?.message}`);
  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn(`Delete warning: ${error.message}`);
}

export function buildFilePath(userId: string | null, jobId: string, filename: string): string {
  const uid = userId ?? "anon";
  return `${uid}/${jobId}/${filename}`;
}
