export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-job-id, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT, PATCH",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  return null;
}

export function withCors(headers: Record<string, string> = {}): Record<string, string> {
  return { ...corsHeaders, ...headers };
}
