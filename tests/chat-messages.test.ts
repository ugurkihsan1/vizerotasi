import { expect, it } from "vitest";
import {
  mergeChatMessages,
  type LocalChatMessage,
} from "../src/lib/chat-messages";
const message = (id: string, time: string): LocalChatMessage => ({
  id,
  room_id: "room",
  sender_id: "member",
  body: "hello",
  created_at: time,
  hidden_at: null,
  profiles: null,
});
it("server copies replace pending previews without duplicates and preserve real timestamps and removal", () => {
  const local = {
    ...message("one", "2026-10-28T12:00:00Z"),
    delivery_state: "sending" as const,
  };
  const server = {
    ...message("one", "2026-10-28T11:59:59Z"),
    body: "",
    hidden_at: "2026-10-28T12:00:01Z",
  };
  const result = mergeChatMessages([server], [local]);
  expect(result).toEqual([server]);
  expect(result[0].delivery_state).toBeUndefined();
});
it("keeps consecutive acknowledged messages visible while stale history refetches and orders older pages", () => {
  const older = message("old", "2026-10-28T10:00:00Z");
  const first = {
    ...message("first", "2026-10-28T12:00:00Z"),
    delivery_state: "sent" as const,
  };
  const next = {
    ...message("next", "2026-10-28T12:00:01Z"),
    delivery_state: "sending" as const,
  };
  expect(mergeChatMessages([older], [first, next]).map((m) => m.id)).toEqual([
    "next",
    "first",
    "old",
  ]);
});
