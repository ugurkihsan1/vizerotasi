import { beforeAll, afterAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

let pg: PGlite;
async function root(sql: string, args: unknown[] = []) {
  await pg.exec("reset role");
  return pg.query(sql, args);
}
async function signup(provider: string, metadata: object = {}) {
  const id = randomUUID();
  await root("insert into auth.users values($1,$2,$3)", [
    id,
    JSON.stringify({ provider }),
    JSON.stringify(metadata),
  ]);
  return id;
}
const choice = () => ({
  privacyVersion: "2026-10-30.1",
  transferVersion: "2026-10-30.1",
  termsVersion: "2026-10-29.1",
  supabase: true,
  google: true,
  github: false,
  source: "native",
  acknowledgedAt: new Date().toISOString(),
});
async function complete(
  owner: string | null,
  username: string,
  accepted: boolean | null = true,
) {
  await pg.exec(`reset role;set role ${owner ? "authenticated" : "anon"}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    owner ?? "",
  ]);
  return pg.query(
    "select * from complete_social_signup($1,'Örnek Yolcu',$2,true,true,$3::jsonb)",
    [username, accepted, JSON.stringify(choice())],
  );
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create table profiles(id uuid primary key references auth.users,username text not null unique check(username~'^[a-z0-9_]{3,24}$'),display_name text not null check(length(display_name) between 2 and 60));
    grant update(display_name) on profiles to authenticated;
    create table notification_preferences(user_id uuid primary key references profiles);
  `);
  await pg.exec(
    readFileSync(
      "supabase/migrations/202610290023_legal_preferences.sql",
      "utf8",
    ),
  );
  await pg.exec(
    readFileSync("supabase/migrations/202610300024_social_signin.sql", "utf8"),
  );
  await pg.exec(
    "create trigger on_signup after insert on auth.users for each row execute function handle_signup()",
  );
});
afterAll(async () => pg.close());

it("creates provisional Google/Apple profiles without pretending they accepted terms", async () => {
  for (const provider of ["google", "apple"]) {
    const id = await signup(provider, { full_name: "Örnek Yolcu" });
    const profile = await root("select * from profiles where id=$1", [id]);
    expect(profile.rows[0]).toMatchObject({
      id,
      display_name: "Örnek Yolcu",
      needs_onboarding: true,
    });
    expect((profile.rows[0] as { username: string }).username).toMatch(
      /^[a-z0-9_]{3,24}$/,
    );
    expect(
      (
        await root("select * from legal_preference_receipts where user_id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(0);
  }
});

it("keeps email signup consent checks and does not trust a user-supplied provider", async () => {
  await expect(
    signup("email", {
      provider: "google",
      username: "fake_social",
      display_name: "Örnek",
    }),
  ).rejects.toThrow("Consent required");
  const id = await signup("email", {
    username: "email_member",
    display_name: "Örnek",
    terms_accepted: true,
    privacy_accepted: true,
  });
  expect(
    (await root("select needs_onboarding from profiles where id=$1", [id]))
      .rows[0],
  ).toEqual({ needs_onboarding: false });
});

it("requires explicit choices and an authenticated owner, then saves the profile and receipt together", async () => {
  const id = await signup("google");
  await expect(complete(null, "no_owner")).rejects.toThrow();
  await expect(complete(id, "not_accepted", false)).rejects.toThrow(
    "Consent required",
  );
  await expect(complete(id, "not_accepted", null)).rejects.toThrow(
    "Consent required",
  );
  const result = await complete(id, "chosen_name");
  expect(result.rows[0]).toMatchObject({
    id,
    username: "chosen_name",
    needs_onboarding: false,
  });
  expect(
    (
      await root("select * from legal_preference_receipts where user_id=$1", [
        id,
      ])
    ).rows,
  ).toHaveLength(1);
  await complete(id, "other_name");
  expect(
    (await root("select username from profiles where id=$1", [id])).rows[0],
  ).toEqual({ username: "chosen_name" });
});

it("rolls back a receipt when the username is taken and never changes another account", async () => {
  const owner = await signup("apple");
  const other = await signup("google");
  await complete(owner, "already_taken");
  await expect(complete(other, "already_taken")).rejects.toThrow();
  expect(
    (await root("select needs_onboarding from profiles where id=$1", [other]))
      .rows[0],
  ).toEqual({ needs_onboarding: true });
  expect(
    (
      await root("select * from legal_preference_receipts where user_id=$1", [
        other,
      ])
    ).rows,
  ).toHaveLength(0);
  await pg.exec("set role authenticated");
  await expect(
    pg.query("update profiles set needs_onboarding=false where id=$1", [other]),
  ).rejects.toThrow();
});
