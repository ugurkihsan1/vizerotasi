import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { retentionHandler } from "../_shared/retention-cleanup.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(15_000) }),
    },
  },
);
Deno.serve(
  retentionHandler(
    {
      async claim(batch_size) {
        const result = await admin.rpc("claim_evidence_cleanup", {
          batch_size,
        });
        if (result.error) throw result.error;
        return result.data ?? [];
      },
      async remove(path) {
        const result = await admin.storage.from("post-evidence").remove([path]);
        // Account deletion or a previous interrupted run may already have
        // removed it. SQL still verifies actual absence before acknowledging.
        if (
          result.error &&
          result.error.status !== 404 &&
          String(result.error.statusCode) !== "404"
        )
          throw result.error;
      },
      async finish(target, token) {
        const result = await admin.rpc("finish_evidence_cleanup", {
          target,
          token,
        });
        if (result.error) throw result.error;
      },
      async retry(target, token) {
        const result = await admin.rpc("retry_evidence_cleanup", {
          target,
          token,
        });
        if (result.error) throw result.error;
      },
      async succeeded() {
        const result = await admin.rpc("retention_worker_succeeded");
        if (result.error) throw result.error;
      },
    },
    Deno.env.get("RETENTION_CRON_SECRET") ?? "",
  ),
);
