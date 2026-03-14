#!/usr/bin/env node
/**
 * MCP Server — Google Cloud Console
 *
 * Authenticates via:
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON string of service account key)
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON file)
 *   3. Application Default Credentials (`gcloud auth application-default login`)
 *
 * Tools:
 *   - list_projects
 *   - get_project
 *   - enable_api
 *   - disable_api
 *   - list_enabled_apis
 *   - list_oauth_clients
 *   - create_oauth_client
 *   - list_service_accounts
 *   - create_service_account
 *   - create_service_account_key
 *   - list_iam_roles
 *   - add_iam_binding
 *   - get_oauth_setup_url  (opens Console URL for manual OAuth credential setup)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyEnv) {
    const credentials = JSON.parse(keyEnv);
    return new GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/cloudplatformprojects",
      ],
    });
  }
  return new GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/cloudplatformprojects",
    ],
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(msg: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

function arg<T>(args: Record<string, unknown>, key: string): T {
  return args[key] as T;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_projects",
    description: "List all Google Cloud projects accessible to the authenticated account.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_project",
    description: "Get details about a specific Google Cloud project.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string", description: "GCP project ID" } },
      required: ["project_id"],
    },
  },
  {
    name: "list_enabled_apis",
    description: "List all enabled APIs/services for a project.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "enable_api",
    description: "Enable a Google Cloud API/service for a project (e.g. 'iamcredentials.googleapis.com').",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        api: { type: "string", description: "API service name e.g. 'gmail.googleapis.com'" },
      },
      required: ["project_id", "api"],
    },
  },
  {
    name: "disable_api",
    description: "Disable a Google Cloud API/service for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        api: { type: "string" },
      },
      required: ["project_id", "api"],
    },
  },
  {
    name: "list_service_accounts",
    description: "List all service accounts in a GCP project.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "create_service_account",
    description: "Create a new service account in a GCP project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        account_id: { type: "string", description: "Short ID (becomes email prefix)" },
        display_name: { type: "string", description: "Human-readable name" },
      },
      required: ["project_id", "account_id"],
    },
  },
  {
    name: "create_service_account_key",
    description: "Create a JSON key for a service account. Returns the key JSON.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        service_account_email: { type: "string" },
      },
      required: ["project_id", "service_account_email"],
    },
  },
  {
    name: "list_iam_policy",
    description: "Get the IAM policy (roles and members) for a project.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "add_iam_binding",
    description: "Grant a role to a member on a project (e.g. add editor role to a service account).",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        member: { type: "string", description: "e.g. 'serviceAccount:name@project.iam.gserviceaccount.com'" },
        role: { type: "string", description: "e.g. 'roles/editor'" },
      },
      required: ["project_id", "member", "role"],
    },
  },
  {
    name: "list_oauth_clients",
    description: "List OAuth 2.0 clients (brands/clients) for a project via Identity-Aware Proxy API.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "create_oauth_client",
    description: "Create an OAuth 2.0 client credential for a project (uses IAP brand). Returns client_id and client_secret.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        display_name: { type: "string", description: "App name shown on consent screen" },
        redirect_uris: {
          type: "array",
          items: { type: "string" },
          description: "Authorized redirect URIs (e.g. https://your-project.supabase.co/auth/v1/callback)",
        },
      },
      required: ["project_id", "display_name", "redirect_uris"],
    },
  },
  {
    name: "get_oauth_setup_url",
    description: "Get the direct Google Cloud Console URL to create OAuth 2.0 credentials for a project.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
];

// ─── Tool handlers ─────────────────────────────────────────────────────────────

async function handleTool(name: string, args: Record<string, unknown>) {
  const auth = getAuth();

  switch (name) {
    // ── Projects ──────────────────────────────────────────────────────────────
    case "list_projects": {
      const rm = google.cloudresourcemanager({ version: "v3", auth });
      const res = await rm.projects.list({ pageSize: 100 });
      return ok(res.data.projects ?? []);
    }

    case "get_project": {
      const rm = google.cloudresourcemanager({ version: "v3", auth });
      const projectId = arg<string>(args, "project_id");
      const res = await rm.projects.get({ name: `projects/${projectId}` });
      return ok(res.data);
    }

    // ── APIs ──────────────────────────────────────────────────────────────────
    case "list_enabled_apis": {
      const su = google.serviceusage({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const res = await su.services.list({
        parent: `projects/${projectId}`,
        filter: "state:ENABLED",
        pageSize: 200,
      });
      const names = (res.data.services ?? []).map((s) => s.name);
      return ok(names);
    }

    case "enable_api": {
      const su = google.serviceusage({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const api = arg<string>(args, "api");
      const res = await su.services.enable({
        name: `projects/${projectId}/services/${api}`,
      });
      return ok({ operation: res.data.name, status: "enabling", api });
    }

    case "disable_api": {
      const su = google.serviceusage({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const api = arg<string>(args, "api");
      const res = await su.services.disable({
        name: `projects/${projectId}/services/${api}`,
      });
      return ok({ operation: res.data.name, status: "disabling", api });
    }

    // ── Service Accounts ──────────────────────────────────────────────────────
    case "list_service_accounts": {
      const iam = google.iam({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const res = await iam.projects.serviceAccounts.list({
        name: `projects/${projectId}`,
      });
      return ok(res.data.accounts ?? []);
    }

    case "create_service_account": {
      const iam = google.iam({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const accountId = arg<string>(args, "account_id");
      const displayName = arg<string>(args, "display_name") ?? accountId;
      const res = await iam.projects.serviceAccounts.create({
        name: `projects/${projectId}`,
        requestBody: {
          accountId,
          serviceAccount: { displayName },
        },
      });
      return ok(res.data);
    }

    case "create_service_account_key": {
      const iam = google.iam({ version: "v1", auth });
      const projectId = arg<string>(args, "project_id");
      const email = arg<string>(args, "service_account_email");
      const res = await iam.projects.serviceAccounts.keys.create({
        name: `projects/${projectId}/serviceAccounts/${email}`,
        requestBody: { privateKeyType: "TYPE_GOOGLE_CREDENTIALS_FILE" },
      });
      // Decode the base64 key
      const keyJson = Buffer.from(res.data.privateKeyData ?? "", "base64").toString("utf8");
      return ok(JSON.parse(keyJson));
    }

    // ── IAM ───────────────────────────────────────────────────────────────────
    case "list_iam_policy": {
      const rm = google.cloudresourcemanager({ version: "v3", auth });
      const projectId = arg<string>(args, "project_id");
      const res = await rm.projects.getIamPolicy({
        resource: `projects/${projectId}`,
        requestBody: {},
      });
      return ok(res.data);
    }

    case "add_iam_binding": {
      const rm = google.cloudresourcemanager({ version: "v3", auth });
      const projectId = arg<string>(args, "project_id");
      const member = arg<string>(args, "member");
      const role = arg<string>(args, "role");

      // Get current policy
      const policyRes = await rm.projects.getIamPolicy({
        resource: `projects/${projectId}`,
        requestBody: {},
      });
      const policy = policyRes.data;
      const bindings = policy.bindings ?? [];

      const existing = bindings.find((b) => b.role === role);
      if (existing) {
        if (!existing.members?.includes(member)) {
          existing.members = [...(existing.members ?? []), member];
        }
      } else {
        bindings.push({ role, members: [member] });
      }

      const res = await rm.projects.setIamPolicy({
        resource: `projects/${projectId}`,
        requestBody: { policy: { ...policy, bindings } },
      });
      return ok(res.data);
    }

    // ── OAuth Clients ─────────────────────────────────────────────────────────
    case "list_oauth_clients": {
      const projectId = arg<string>(args, "project_id");
      // First, find the brand
      const authClient = await auth.getClient();
      const brandRes = await authClient.request({
        url: `https://iap.googleapis.com/v1/projects/${projectId}/brands`,
        method: "GET",
      });
      const brands = (brandRes.data as { brands?: Array<{ name: string }> }).brands ?? [];
      if (brands.length === 0) return ok({ message: "No OAuth consent screen configured yet.", brands: [] });

      const brandName = brands[0].name;
      const clientsRes = await authClient.request({
        url: `https://iap.googleapis.com/v1/${brandName}/identityAwareProxyClients`,
        method: "GET",
      });
      return ok(clientsRes.data);
    }

    case "create_oauth_client": {
      const projectId = arg<string>(args, "project_id");
      const displayName = arg<string>(args, "display_name");
      const redirectUris = arg<string[]>(args, "redirect_uris");
      const authClient = await auth.getClient();

      // Step 1: Ensure a brand (consent screen) exists
      let brandName: string;
      try {
        const brandRes = await authClient.request({
          url: `https://iap.googleapis.com/v1/projects/${projectId}/brands`,
          method: "GET",
        });
        const brands = (brandRes.data as { brands?: Array<{ name: string }> }).brands ?? [];
        if (brands.length > 0) {
          brandName = brands[0].name;
        } else {
          // Create a brand
          const newBrand = await authClient.request({
            url: `https://iap.googleapis.com/v1/projects/${projectId}/brands`,
            method: "POST",
            data: {
              applicationTitle: displayName,
              supportEmail: `admin@${projectId}.iam.gserviceaccount.com`,
            },
          });
          brandName = (newBrand.data as { name: string }).name;
        }
      } catch (e) {
        return err(
          `Could not create/find OAuth brand. Ensure the IAP API is enabled and you have permissions. ` +
          `Manual URL: https://console.cloud.google.com/apis/credentials?project=${projectId}\n${e}`
        );
      }

      // Step 2: Create the IAP OAuth client
      const clientRes = await authClient.request({
        url: `https://iap.googleapis.com/v1/${brandName}/identityAwareProxyClients`,
        method: "POST",
        data: { displayName },
      });

      const client = clientRes.data as { name: string; secret: string; displayName: string };
      const clientId = client.name.split("/").pop();

      return ok({
        client_id: `${clientId}.apps.googleusercontent.com`,
        client_secret: client.secret,
        display_name: client.displayName,
        redirect_uris: redirectUris,
        note: "Add these redirect URIs in Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs",
        console_url: `https://console.cloud.google.com/apis/credentials?project=${projectId}`,
      });
    }

    case "get_oauth_setup_url": {
      const projectId = arg<string>(args, "project_id");
      return ok({
        credentials_url: `https://console.cloud.google.com/apis/credentials?project=${projectId}`,
        consent_screen_url: `https://console.cloud.google.com/apis/credentials/consent?project=${projectId}`,
        instructions: [
          "1. Go to credentials_url",
          "2. Click 'Create Credentials' → 'OAuth 2.0 Client ID'",
          "3. Application type: Web application",
          "4. Add authorized redirect URI: https://yotqoouitaonibdtfztx.supabase.co/auth/v1/callback",
          "5. Copy Client ID and Client Secret",
          "6. Go to Supabase Dashboard → Authentication → Providers → Google → paste credentials",
        ],
      });
    }

    default:
      return err(`Unknown tool: ${name}`);
  }
}

// ─── Server setup ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "google-cloud", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    return await handleTool(name, args as Record<string, unknown>);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(msg);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Google Cloud MCP server running");
