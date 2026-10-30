import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { markNotificationsRead } from "../src/lib/notification-read";

function client(error: object | null = null) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi
      .fn()
      .mockResolvedValue({
        data: [{ id: "notice-a", read_at: "2026-10-30T10:00:00Z" }],
        error,
      }),
  };
  const from = vi.fn(() => query);
  return { db: { from } as unknown as SupabaseClient, query, from };
}
it("marks only displayed unread notices belonging to the current user", async () => {
  const mock = client();
  const rows = await markNotificationsRead(mock.db, "user-a", [
    "notice-a",
    "notice-a",
  ]);
  expect(mock.from).toHaveBeenCalledWith("notifications");
  expect(mock.query.eq).toHaveBeenCalledWith("user_id", "user-a");
  expect(mock.query.in).toHaveBeenCalledWith("id", ["notice-a"]);
  expect(mock.query.is).toHaveBeenCalledWith("read_at", null);
  expect(rows[0].read_at).toBeTruthy();
});
it("does not write when no unread notices are displayed and surfaces failed writes", async () => {
  const mock = client({ code: "42501" });
  expect(await markNotificationsRead(mock.db, "user-a", [])).toEqual([]);
  expect(mock.from).not.toHaveBeenCalled();
  await expect(
    markNotificationsRead(mock.db, "user-a", ["notice-a"]),
  ).rejects.toMatchObject({ code: "42501" });
});
