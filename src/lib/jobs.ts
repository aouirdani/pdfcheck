/**
 * Job CRUD + Supabase Realtime subscription
 * Maps to the `jobs` table in PostgreSQL
 */
import { supabase } from "./supabase";
import type { Job, JobStatus, JobTool } from "./database.types";

export type { Job };

// Type-cast helper so we don't fight supabase-js generic inference
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createJob(params: {
  tool: JobTool;
  inputPaths: string[];
  metadata?: Record<string, unknown>;
}): Promise<Job> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await db
    .from("jobs")
    .insert({
      user_id: user?.id ?? null,
      tool: params.tool,
      status: "pending" as JobStatus,
      progress: 0,
      input_paths: params.inputPaths,
      output_path: null,
      error_message: null,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create job: ${error.message}`);
  return data as Job;
}

export async function updateJob(
  jobId: string,
  updates: Partial<Pick<Job, "status" | "progress" | "output_path" | "error_message" | "metadata">>
): Promise<void> {
  const { error } = await db
    .from("jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) console.warn(`Job update warning: ${error.message}`);
}

export async function getJob(jobId: string): Promise<Job | null> {
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) return null;
  return data as Job;
}

export async function listJobs(limit = 20): Promise<Job[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Job[];
}

export async function deleteJob(jobId: string): Promise<void> {
  await db.from("jobs").delete().eq("id", jobId);
}

// ─── REALTIME ─────────────────────────────────────────────────────────────────

export function subscribeToJob(jobId: string, onUpdate: (job: Job) => void): () => void {
  const ch = (supabase as any).channel(`job:${jobId}`);
  ch.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${jobId}` },
    (payload: { new: unknown }) => onUpdate(payload.new as Job)
  ).subscribe();
  return () => supabase.removeChannel(ch);
}

export function subscribeToUserJobs(userId: string, onUpdate: (job: Job) => void): () => void {
  const ch = (supabase as any).channel(`user-jobs:${userId}`);
  ch.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "jobs", filter: `user_id=eq.${userId}` },
    (payload: { new: unknown }) => onUpdate(payload.new as Job)
  ).subscribe();
  return () => supabase.removeChannel(ch);
}
