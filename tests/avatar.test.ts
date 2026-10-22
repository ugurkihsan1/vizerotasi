import { finishPendingAvatar, savePendingAvatar } from "../src/lib/avatar";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  upload: vi.fn(),
  update: vi.fn(),
}));
vi.mock("expo-image-picker", () => ({}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => mock.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mock.storage.set(key, value);
    },
    removeItem: async (key: string) => {
      mock.storage.delete(key);
    },
  },
}));
vi.mock("../src/lib/supabase", () => ({
  db: () => ({
    storage: {
      from: () => ({
        upload: mock.upload,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://fixture.example/${path}` },
        }),
      }),
    },
    from: () => ({ update: mock.update }),
  }),
}));
const photo = { base64: "/9j/AA==", mimeType: "image/jpeg" as const };
beforeEach(() => {
  mock.storage.clear();
  mock.upload.mockReset().mockResolvedValue({ error: null });
  mock.update
    .mockReset()
    .mockReturnValue({ eq: async () => ({ error: null }) });
});
it("defers photo upload until authentication and keeps drafts isolated by account", async () => {
  await savePendingAvatar("alice", photo);
  expect(mock.upload).not.toHaveBeenCalled();
  expect(await finishPendingAvatar("bob")).toBe(false);
  expect(mock.upload).not.toHaveBeenCalled();
  await Promise.all([
    finishPendingAvatar("alice"),
    finishPendingAvatar("alice"),
  ]);
  expect(mock.upload).toHaveBeenCalledTimes(1);
  expect(mock.upload.mock.calls[0][0]).toMatch(/^alice\/.+\.jpg$/);
  expect(mock.update).toHaveBeenCalledWith({
    avatar_url: expect.stringContaining("/alice/"),
  });
  expect(mock.storage.size).toBe(0);
});
it("retains a failed upload for retry without discarding the signup photo", async () => {
  await savePendingAvatar("alice", photo);
  mock.upload.mockResolvedValueOnce({ error: new Error("offline") });
  await expect(finishPendingAvatar("alice")).rejects.toThrow("offline");
  expect(mock.storage.size).toBe(1);
  expect(await finishPendingAvatar("alice")).toBe(true);
  expect(mock.storage.size).toBe(0);
});
