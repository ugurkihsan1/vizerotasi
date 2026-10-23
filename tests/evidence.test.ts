import {
  chooseEvidence,
  uploadEvidence,
  type EvidenceDraft,
} from "../src/lib/evidence";
import { it, expect, vi, beforeEach } from "vitest";
const mock = vi.hoisted(() => ({
  pick: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: mock.pick }));
vi.mock("expo-file-system", () => ({ File: class {} }));
vi.mock("../src/lib/supabase", () => ({
  configured: true,
  db: () => ({
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
    rpc: mock.rpc,
  }),
}));

function file(content = "%PDF-1.4\n%%EOF"): EvidenceDraft {
  const blob = new File([content], "redacted.pdf", { type: "application/pdf" });
  return {
    name: blob.name,
    lastModified: blob.lastModified,
    mimeType: blob.type,
    size: blob.size,
    uri: "fixture:private-file",
    file: blob,
  };
}
beforeEach(() => {
  mock.pick.mockReset();
  mock.upload.mockReset().mockResolvedValue({ error: null });
  mock.remove.mockReset().mockResolvedValue({ error: null });
  mock.rpc.mockReset().mockResolvedValue({ error: null });
});
it("rejects excessive evidence selections and unsupported types before uploading", async () => {
  mock.pick.mockResolvedValue({
    canceled: false,
    assets: Array(6).fill(file()),
  });
  await expect(chooseEvidence(5)).rejects.toThrow("En fazla 5");
  mock.pick.mockResolvedValue({
    canceled: false,
    assets: [{ ...file(), mimeType: "text/html" }],
  });
  await expect(chooseEvidence(5)).rejects.toThrow("PDF, JPG veya PNG");
  expect(mock.upload).not.toHaveBeenCalled();
});
it("does not upload HTML disguised as a PDF", async () => {
  await expect(
    uploadEvidence(file("<html>private</html>"), "owner", "post"),
  ).rejects.toThrow("biçimi");
  expect(mock.upload).not.toHaveBeenCalled();
});
it("uploads to an owner/post path and removes unregistered files after metadata errors", async () => {
  mock.rpc.mockResolvedValue({ error: new Error("register failed") });
  await expect(uploadEvidence(file(), "owner", "post")).rejects.toThrow(
    "register failed",
  );
  const path = mock.upload.mock.calls[0][0];
  expect(path).toMatch(/^owner\/post\/.+\.pdf$/);
  expect(mock.rpc).toHaveBeenCalledWith("register_post_evidence", {
    target: "post",
    path,
    original_name: "redacted.pdf",
  });
  expect(mock.remove).toHaveBeenCalledWith([path]);
});
