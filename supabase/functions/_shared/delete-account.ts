export type AccountFile = { bucket_id: string; object_name: string };
export interface DeletionBackend {
  user(token: string): Promise<{ id: string; email: string } | null>;
  password(email: string, password: string, id: string): Promise<boolean>;
  begin(id: string): Promise<void>;
  files(id: string): Promise<AccountFile[]>;
  remove(bucket: string, paths: string[]): Promise<void>;
  finish(id: string): Promise<void>;
}
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
export function deletionHandler(backend: DeletionBackend) {
  const reply = (status: number, code: string) =>
    new Response(JSON.stringify({ code }), { status, headers });
  return async (request: Request) => {
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    const token = request.headers
      .get("Authorization")
      ?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, "unauthorized");
    // Bound the request before parsing a secret-bearing body. Never log it.
    const raw = await request.text();
    if (raw.length > 4096) return reply(413, "invalid_request");
    let body: { confirmation?: unknown; password?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(400, "invalid_request");
    }
    if (
      !body ||
      body.confirmation !== "SİL" ||
      typeof body.password !== "string" ||
      !body.password ||
      body.password.length > 1024
    )
      return reply(400, "confirmation_required");
    try {
      const user = await backend.user(token);
      if (!user) return reply(401, "unauthorized");
      if (!(await backend.password(user.email, body.password, user.id)))
        return reply(403, "invalid_password");
      // The caller's verified identity is the only target; body.user_id is ignored.
      await backend.begin(user.id);
      for (let batch = 0; batch < 25; batch++) {
        const files = await backend.files(user.id);
        if (!files.length) {
          await backend.finish(user.id);
          return reply(200, "deleted");
        }
        const groups = new Map<string, string[]>();
        for (const file of files) {
          // Defense in depth: a bad manifest must never delete another user's media.
          const segments = file.object_name.split("/");
          if (
            !(
              ["avatars", "post-evidence"].includes(file.bucket_id) &&
              segments[0] === user.id
            ) &&
            !(file.bucket_id === "chat-media" && segments[1] === user.id)
          )
            throw new Error("Invalid file scope");
          const paths = groups.get(file.bucket_id) ?? [];
          paths.push(file.object_name);
          groups.set(file.bucket_id, paths);
        }
        for (const [bucket, paths] of groups)
          await backend.remove(bucket, paths);
      }
      return reply(503, "deletion_incomplete");
    } catch {
      // Includes partial Storage failures: keep the login and job so retry resumes.
      return reply(503, "deletion_incomplete");
    }
  };
}
