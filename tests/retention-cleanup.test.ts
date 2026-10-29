import { describe, it, expect, vi } from "vitest";
import {
  retentionHandler,
  type EvidenceCleanupJob,
  type RetentionBackend,
} from "../supabase/functions/_shared/retention-cleanup";

const secret = "fixture-scheduler-secret-with-at-least-32-characters";
const user = "00000000-0000-0000-0000-000000000001";
const post = "00000000-0000-0000-0000-000000000002";
const job: EvidenceCleanupJob = {
  job_id: "00000000-0000-0000-0000-000000000003",
  lease_token: "00000000-0000-0000-0000-000000000004",
  evidence_id: "00000000-0000-0000-0000-000000000005",
  user_id: user,
  post_id: post,
  storage_path: `${user}/${post}/redacted.pdf`,
};
function backend(): RetentionBackend {
  return {
    claim: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
    finish: vi.fn(async () => {}),
    retry: vi.fn(async () => {}),
    succeeded: vi.fn(async () => {}),
  };
}
const request = (token = secret, method = "POST") =>
  new Request("https://example.test/functions/v1/retention-cleanup", {
    method,
    headers: { "x-retention-token": token },
  });
describe("scheduled evidence cleanup", () => {
  it("requires the private scheduler secret and POST before querying any files", async () => {
    const db = backend();
    const handle = retentionHandler(db, secret);
    expect((await handle(request(""))).status).toBe(401);
    expect((await handle(request("wrong"))).status).toBe(401);
    expect((await handle(request(secret, "GET"))).status).toBe(405);
    expect((await retentionHandler(db, "")(request(""))).status).toBe(401);
    expect(db.claim).not.toHaveBeenCalled();
  });
  it("removes Storage first and completes metadata only after acknowledgement", async () => {
    const db = backend();
    vi.mocked(db.claim).mockResolvedValueOnce([job]);
    const response = await retentionHandler(db, secret)(request());
    expect(await response.json()).toEqual({ code: "completed", removed: 1 });
    expect(db.remove).toHaveBeenCalledWith(job.storage_path);
    expect(db.finish).toHaveBeenCalledWith(job.job_id, job.lease_token);
    expect(vi.mocked(db.finish).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(db.remove).mock.invocationCallOrder[0],
    );
    expect(db.succeeded).toHaveBeenCalledOnce();
  });
  it("keeps metadata retryable after Storage failures and does not report healthy", async () => {
    const db = backend();
    vi.mocked(db.claim).mockResolvedValueOnce([job]);
    vi.mocked(db.remove).mockRejectedValue(
      new Error("private filename must not leak"),
    );
    const response = await retentionHandler(db, secret)(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private filename");
    expect(db.finish).not.toHaveBeenCalled();
    expect(db.retry).toHaveBeenCalledWith(job.job_id, job.lease_token);
    expect(db.succeeded).not.toHaveBeenCalled();
  });
  it("refuses mismatched owner/post paths and arbitrary bucket/path deletion", async () => {
    for (const storage_path of [
      `someone-else/${post}/private.pdf`,
      `${user}/00000000-0000-0000-0000-000000000099/private.pdf`,
      `${user}/${post}/../private.pdf`,
      `${user}/${post}/..`,
    ]) {
      const db = backend();
      vi.mocked(db.claim).mockResolvedValueOnce([{ ...job, storage_path }]);
      expect((await retentionHandler(db, secret)(request())).status).toBe(503);
      expect(db.remove).not.toHaveBeenCalled();
      expect(db.finish).not.toHaveBeenCalled();
    }
  });
  it("retries after metadata failure and bounds each invocation", async () => {
    const db = backend();
    vi.mocked(db.claim).mockResolvedValueOnce([job]);
    vi.mocked(db.finish).mockRejectedValue(new Error("lease changed"));
    expect((await retentionHandler(db, secret)(request())).status).toBe(503);
    expect(db.retry).toHaveBeenCalledWith(job.job_id, job.lease_token);
    expect(db.succeeded).not.toHaveBeenCalled();
    const busy = backend();
    vi.mocked(busy.claim).mockResolvedValue(Array(10).fill(job));
    await retentionHandler(busy, secret)(request());
    expect(busy.claim).toHaveBeenCalledTimes(5);
    expect(busy.remove).toHaveBeenCalledTimes(50);
  });
});
