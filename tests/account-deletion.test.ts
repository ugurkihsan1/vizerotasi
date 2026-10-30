import { describe, it, expect, vi } from "vitest";
import {
  deletionHandler,
  type DeletionBackend,
} from "../supabase/functions/_shared/delete-account";
const id = "00000000-0000-0000-0000-000000000001";
function backend(): DeletionBackend {
  return {
    user: vi.fn(async () => ({ id, email: "owner@example.com" })),
    password: vi.fn(async () => true),
    begin: vi.fn(async () => {}),
    files: vi.fn(async () => []),
    remove: vi.fn(async () => {}),
    finish: vi.fn(async () => {}),
  };
}
const request = (body: object, token = "verified-token") =>
  new Request("https://example.com/functions/v1/delete-account", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  });
const valid = { password: "correct-password", confirmation: "SİL" };
describe("account deletion server", () => {
  it("requires authentication, explicit confirmation and the current password before changing anything", async () => {
    const db = backend(),
      handle = deletionHandler(db);
    expect((await handle(request(valid, ""))).status).toBe(401);
    expect((await handle(request({ password: "wrong" }))).status).toBe(400);
    vi.mocked(db.password).mockResolvedValue(false);
    expect((await handle(request(valid))).status).toBe(403);
    expect(db.begin).not.toHaveBeenCalled();
    expect(db.finish).not.toHaveBeenCalled();
  });
  it("uses only the authenticated identity and removes all owned file batches before deleting Auth data", async () => {
    const db = backend();
    vi.mocked(db.files)
      .mockResolvedValueOnce([
        { bucket_id: "avatars", object_name: `${id}/me.jpg` },
        { bucket_id: "chat-media", object_name: `room/${id}/photo.jpg` },
      ])
      .mockResolvedValueOnce([]);
    const r = await deletionHandler(db)(
      request({ ...valid, user_id: "someone-else" }),
    );
    expect(await r.json()).toEqual({ code: "deleted" });
    expect(db.begin).toHaveBeenCalledWith(id);
    expect(db.finish).toHaveBeenCalledWith(id);
    expect(db.remove).toHaveBeenCalledWith("avatars", [`${id}/me.jpg`]);
    expect(vi.mocked(db.finish).mock.invocationCallOrder[0]).toBeGreaterThan(
      vi.mocked(db.remove).mock.invocationCallOrder.at(-1)!,
    );
  });
  it("keeps the account retryable on a Storage failure and refuses any other user's file", async () => {
    const db = backend();
    vi.mocked(db.files).mockResolvedValue([
      { bucket_id: "avatars", object_name: `${id}/me.jpg` },
    ]);
    vi.mocked(db.remove).mockRejectedValue(new Error("Storage unavailable"));
    expect((await deletionHandler(db)(request(valid))).status).toBe(503);
    expect(db.finish).not.toHaveBeenCalled();
    vi.mocked(db.files).mockResolvedValue([
      { bucket_id: "avatars", object_name: "someone-else/photo.jpg" },
    ]);
    vi.mocked(db.remove).mockClear();
    expect((await deletionHandler(db)(request(valid))).status).toBe(503);
    expect(db.remove).not.toHaveBeenCalled();
    expect(db.finish).not.toHaveBeenCalled();
  });
});

it("requires a fresh server-verified social sign-in when there is no password", async () => {
  const db = backend();
  vi.mocked(db.user).mockResolvedValue({
    id,
    email: "owner@example.com",
    providers: ["google"],
    reauthenticatedAt: Date.now() - 600000,
  });
  expect(
    (await deletionHandler(db)(request({ confirmation: "SİL" }))).status,
  ).toBe(403);
  expect(db.begin).not.toHaveBeenCalled();
  vi.mocked(db.user).mockResolvedValue({
    id,
    email: "owner@example.com",
    providers: ["google"],
    reauthenticatedAt: Date.now(),
  });
  expect(
    (await deletionHandler(db)(request({ confirmation: "SİL" }))).status,
  ).toBe(200);
  expect(db.password).not.toHaveBeenCalled();
  expect(db.finish).toHaveBeenCalledWith(id);
});

it("revokes Apple's authorization before deletion and preserves the account on revocation failure", async () => {
  const db = backend();
  vi.mocked(db.user).mockResolvedValue({
    id,
    email: "relay@example.com",
    providers: ["apple"],
    reauthenticatedAt: Date.now(),
  });
  db.revokeApple = vi.fn(async () => {});
  expect(
    (await deletionHandler(db)(request({ confirmation: "SİL" }))).status,
  ).toBe(400);
  expect(db.begin).not.toHaveBeenCalled();
  vi.mocked(db.revokeApple).mockRejectedValueOnce(
    new Error("provider unavailable"),
  );
  const body = {
    confirmation: "SİL",
    apple_authorization_code: "fixture-code",
  };
  expect((await deletionHandler(db)(request(body))).status).toBe(503);
  expect(db.begin).not.toHaveBeenCalled();
  expect((await deletionHandler(db)(request(body))).status).toBe(200);
  expect(vi.mocked(db.begin).mock.invocationCallOrder[0]).toBeGreaterThan(
    vi.mocked(db.revokeApple).mock.invocationCallOrder.at(-1)!,
  );
});
