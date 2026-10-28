import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { deletionHandler } from "../_shared/delete-account.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const options = { auth: { persistSession: false, autoRefreshToken: false } };
Deno.serve(
  deletionHandler({
    async user(token) {
      const r = await admin.auth.getUser(token);
      return !r.error && r.data.user?.email
        ? { id: r.data.user.id, email: r.data.user.email }
        : null;
    },
    async password(email, password, id) {
      // Separate client: password verification must not replace the admin JWT.
      const verifier = createClient(url, anonKey, options);
      const r = await verifier.auth.signInWithPassword({ email, password });
      if (r.error) {
        if (r.error.code === "invalid_credentials") return false;
        throw r.error;
      }
      if (r.data.user?.id !== id || !r.data.session) return false;
      // Revoke only this temporary verification session, not the user's other devices.
      await verifier.auth.signOut({ scope: "local" });
      return true;
    },
    async begin(target) {
      const r = await admin.rpc("begin_account_deletion", { target });
      if (r.error) throw r.error;
    },
    async files(target) {
      const r = await admin.rpc("account_deletion_files", { target });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
    async remove(bucket, paths) {
      const r = await admin.storage.from(bucket).remove(paths);
      if (r.error) throw r.error;
    },
    async finish(target) {
      const r = await admin.rpc("finish_account_deletion", { target });
      if (r.error) throw r.error;
    },
  }),
);
