export interface EvidenceCleanupJob {
  job_id: string;
  evidence_id: string | null;
  post_id: string | null;
  user_id: string;
  storage_path: string;
  lease_token: string;
}
export interface RetentionBackend {
  claim(limit: number): Promise<EvidenceCleanupJob[]>;
  remove(path: string): Promise<void>;
  finish(id: string, token: string): Promise<void>;
  retry(id: string, token: string): Promise<void>;
  succeeded(): Promise<void>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sameSecret(actual: string, expected: string) {
  if (expected.length < 32 || expected.length > 512 || actual.length > 512)
    return false;
  let difference = actual.length ^ expected.length;
  for (let i = 0; i < expected.length; i++)
    difference |= expected.charCodeAt(i) ^ (actual.charCodeAt(i) || 0);
  return difference === 0;
}
function validJob(job: EvidenceCleanupJob) {
  const parts = job.storage_path.split("/");
  return (
    uuid.test(job.job_id) &&
    uuid.test(job.lease_token) &&
    uuid.test(job.user_id) &&
    parts.length === 3 &&
    parts[0] === job.user_id &&
    uuid.test(parts[1]) &&
    (!job.post_id || parts[1] === job.post_id) &&
    !!parts[2] &&
    ![".", ".."].includes(parts[2]) &&
    !/[\\\u0000-\u001f]/.test(job.storage_path)
  );
}
export function retentionHandler(
  backend: RetentionBackend,
  secret: string,
  clock: () => number = Date.now,
) {
  const reply = (status: number, data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  return async (request: Request) => {
    if (request.method !== "POST")
      return reply(405, { code: "method_not_allowed" });
    if (!sameSecret(request.headers.get("x-retention-token") ?? "", secret))
      return reply(401, { code: "unauthorized" });
    const deadline = clock() + 70_000;
    let removed = 0,
      failed = 0;
    try {
      // Bound work to the hosted function's wall time; every claim is durable.
      for (let batch = 0; batch < 5 && clock() < deadline; batch++) {
        const jobs = await backend.claim(10);
        if (!jobs.length) break;
        for (const job of jobs) {
          if (clock() >= deadline) {
            failed++;
            await backend.retry(job.job_id, job.lease_token);
            continue;
          }
          try {
            if (!validJob(job)) throw new Error("Invalid cleanup scope");
            await backend.remove(job.storage_path);
            // SQL independently checks Storage absence and the lease token.
            await backend.finish(job.job_id, job.lease_token);
            removed++;
          } catch {
            failed++;
            // Retry changes availability only for our lease; a newer worker's
            // lease is never cleared. No filename, document or secret is logged.
            await backend.retry(job.job_id, job.lease_token);
          }
        }
        if (jobs.length < 10) break;
      }
      if (failed)
        return reply(503, { code: "retry_required", removed, failed });
      await backend.succeeded();
      return reply(200, { code: "completed", removed });
    } catch {
      return reply(503, { code: "cleanup_unavailable", removed, failed });
    }
  };
}
