/** Optional adapter. Payloads never include text, email, query strings or other personal data. */
type Event =
  | "feed_item_open"
  | "country_follow"
  | "helpful_click"
  | "save_click"
  | "experience_created"
  | "question_created"
  | "signup_completed";
type Payload = { contentKind?: string; countryId?: string };
let adapter: ((event: Event, payload: Payload) => void) | undefined;
export function setAnalyticsAdapter(next: typeof adapter) {
  adapter = next;
}
export function track(event: Event, payload: Payload = {}) {
  adapter?.(event, payload);
}
