import type { ChatMessage } from "./chat";
export type LocalChatMessage = ChatMessage & {
  delivery_state?: "sending" | "sent";
};
/** Server copies win over local previews, including moderation and real timestamps. */
export function mergeChatMessages(
  server: ChatMessage[],
  local: LocalChatMessage[],
): LocalChatMessage[] {
  const messages = new Map<string, LocalChatMessage>();
  for (const message of local) messages.set(message.id, message);
  for (const message of server) messages.set(message.id, message);
  return [...messages.values()].sort(
    (a, b) =>
      Date.parse(b.created_at) - Date.parse(a.created_at) ||
      b.id.localeCompare(a.id),
  );
}
