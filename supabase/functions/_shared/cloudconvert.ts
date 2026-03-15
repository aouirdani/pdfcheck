/**
 * Shared CloudConvert helper for Deno Edge Functions
 * Requires CLOUDCONVERT_API_KEY env var (set via: supabase secrets set CLOUDCONVERT_API_KEY=...)
 *
 * Free tier: 25 conversions/day on https://cloudconvert.com
 * Sandbox (test):  https://sandbox.cloudconvert.com  — unlimited but fake files
 * Production:      https://cloudconvert.com          — real conversions, costs credits
 */

const CC_API = "https://api.cloudconvert.com/v2";

export interface CCConvertResult {
  bytes: Uint8Array;
  filename: string;
  size: number;
}

/** Extract the most useful error message from a CloudConvert job/tasks response */
function extractCCError(jobData: Record<string, unknown>): string {
  // Job-level message
  const jobMsg = (jobData as any)?.data?.message as string | undefined;

  // Task-level error messages (more specific)
  const tasks: any[] = (jobData as any)?.data?.tasks ?? [];
  const failedTask = tasks.find((t) => t.status === "error");
  const taskMsg: string | undefined = failedTask?.message;

  return taskMsg || jobMsg || "CloudConvert job failed (no details)";
}

export async function cloudConvertFile(
  fileBytes: ArrayBuffer,
  filename: string,
  inputFormat: string,
  outputFormat: string,
  extraConvertOptions: Record<string, unknown> = {}
): Promise<CCConvertResult> {
  const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
  if (!apiKey) {
    throw new Error(
      "CLOUDCONVERT_API_KEY is not configured. " +
      "Run: supabase secrets set CLOUDCONVERT_API_KEY=<your_key>"
    );
  }

  // ── Step 1: Create job ────────────────────────────────────────────────────
  console.log(`[cloudconvert] Creating job: ${inputFormat} → ${outputFormat} (${filename})`);

  const jobRes = await fetch(`${CC_API}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "upload-task": { operation: "import/upload" },
        "convert-task": {
          operation: "convert",
          input: "upload-task",
          input_format: inputFormat,
          output_format: outputFormat,
          ...extraConvertOptions,
        },
        "export-task": {
          operation: "export/url",
          input: "convert-task",
        },
      },
    }),
  });

  if (!jobRes.ok) {
    const body = await jobRes.text();
    console.error(`[cloudconvert] Job create HTTP ${jobRes.status}:`, body);
    if (jobRes.status === 401) {
      throw new Error("CloudConvert API key is invalid or expired (401). Check CLOUDCONVERT_API_KEY.");
    }
    if (jobRes.status === 422) {
      throw new Error(`CloudConvert rejected the job format (422). Check input/output formats. Details: ${body}`);
    }
    throw new Error(`CloudConvert job create failed (${jobRes.status}): ${body}`);
  }

  const jobData = await jobRes.json();
  const jobId: string = jobData?.data?.id;
  if (!jobId) {
    throw new Error(`CloudConvert returned no job ID. Response: ${JSON.stringify(jobData)}`);
  }

  const tasks: any[] = jobData?.data?.tasks ?? [];
  const uploadTask = tasks.find((t) => t.operation === "import/upload");
  if (!uploadTask) {
    throw new Error("CloudConvert: import/upload task not found in job response");
  }

  // ── Step 2: Upload file ───────────────────────────────────────────────────
  const uploadUrl: string = uploadTask?.result?.form?.url;
  if (!uploadUrl) {
    throw new Error("CloudConvert: no upload URL in import/upload task result. Task: " + JSON.stringify(uploadTask));
  }

  const uploadParams: Record<string, string> = uploadTask?.result?.form?.parameters ?? {};
  const form = new FormData();
  for (const [k, v] of Object.entries(uploadParams)) form.append(k, v);
  form.append("file", new Blob([fileBytes]), filename);

  console.log(`[cloudconvert] Uploading file to: ${uploadUrl}`);
  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok) {
    const uploadBody = await uploadRes.text();
    throw new Error(`CloudConvert file upload failed (${uploadRes.status}): ${uploadBody}`);
  }

  // ── Step 3: Poll for completion ───────────────────────────────────────────
  console.log(`[cloudconvert] Polling job ${jobId}...`);
  const MAX_ATTEMPTS = 90; // 90 × 2s = 3 minutes
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      console.warn(`[cloudconvert] Poll HTTP ${statusRes.status} on attempt ${attempt + 1}`);
      continue; // transient error, keep retrying
    }

    const status = await statusRes.json();
    const jobStatus: string = status?.data?.status;

    console.log(`[cloudconvert] Attempt ${attempt + 1}: job status = ${jobStatus}`);

    if (jobStatus === "error") {
      const msg = extractCCError(status);
      console.error(`[cloudconvert] Job ${jobId} failed:`, msg, JSON.stringify(status?.data?.tasks));
      throw new Error(`CloudConvert conversion failed: ${msg}`);
    }

    if (jobStatus === "finished") {
      const allTasks: any[] = status?.data?.tasks ?? [];
      const exportTask = allTasks.find((t) => t.operation === "export/url");
      const file = exportTask?.result?.files?.[0];

      if (!file?.url) {
        throw new Error(
          "CloudConvert finished but no output file found. Export task: " +
          JSON.stringify(exportTask)
        );
      }

      console.log(`[cloudconvert] Job ${jobId} done. Downloading: ${file.filename}`);
      const dlRes = await fetch(file.url);
      if (!dlRes.ok) {
        throw new Error(`Failed to download CloudConvert result (${dlRes.status}): ${file.url}`);
      }

      const bytes = new Uint8Array(await dlRes.arrayBuffer());
      return { bytes, filename: file.filename, size: file.size ?? bytes.length };
    }
  }

  throw new Error(`CloudConvert job ${jobId} timed out after 3 minutes`);
}
