/**
 * Shared CloudConvert helper for Deno Edge Functions
 * Requires CLOUDCONVERT_API_KEY env var
 */

const CC_API = "https://api.cloudconvert.com/v2";

export interface CCConvertResult {
  bytes: Uint8Array;
  filename: string;
  size: number;
}

export async function cloudConvertFile(
  fileBytes: ArrayBuffer,
  filename: string,
  inputFormat: string,
  outputFormat: string,
  extraConvertOptions: Record<string, unknown> = {}
): Promise<CCConvertResult> {
  const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
  if (!apiKey) throw new Error("CLOUDCONVERT_API_KEY is not configured");

  // 1. Create job
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
        "export-task": { operation: "export/url", input: "convert-task" },
      },
    }),
  });

  if (!jobRes.ok) {
    const errBody = await jobRes.text();
    throw new Error(`CloudConvert job create failed (${jobRes.status}): ${errBody}`);
  }

  const jobData = await jobRes.json();
  const jobId: string = jobData.data.id;
  const uploadTask = jobData.data.tasks.find(
    (t: { operation: string }) => t.operation === "import/upload"
  );

  // 2. Upload file
  const uploadUrl: string = uploadTask?.result?.form?.url;
  if (!uploadUrl) throw new Error("CloudConvert: no upload URL returned");

  const uploadParams: Record<string, string> = uploadTask?.result?.form?.parameters ?? {};
  const form = new FormData();
  for (const [k, v] of Object.entries(uploadParams)) form.append(k, v);
  form.append("file", new Blob([fileBytes]), filename);

  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  if (!uploadRes.ok) {
    throw new Error(`CloudConvert upload failed (${uploadRes.status})`);
  }

  // 3. Poll for completion
  for (let attempt = 0; attempt < 90; attempt++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`${CC_API}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = await statusRes.json();

    if (status.data?.status === "error") {
      throw new Error(status.data.message ?? "CloudConvert job failed");
    }

    if (status.data?.status === "finished") {
      const exportTask = status.data.tasks?.find(
        (t: { operation: string }) => t.operation === "export/url"
      );
      const file = exportTask?.result?.files?.[0];
      if (!file) throw new Error("No output file from CloudConvert");

      const dlRes = await fetch(file.url);
      if (!dlRes.ok) throw new Error(`Failed to download CloudConvert result: ${dlRes.status}`);

      const bytes = new Uint8Array(await dlRes.arrayBuffer());
      return { bytes, filename: file.filename, size: file.size };
    }
  }

  throw new Error("CloudConvert job timed out after 3 minutes");
}
