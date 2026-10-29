import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

let pg: PGlite;
const migration = readFileSync(
  "supabase/migrations/202610290023_legal_preferences.sql",
  "utf8",
);
async function root(sql: string, args: unknown[] = []) {
  await pg.exec("reset role");
  return pg.query(sql, args);
}
async function as(user: string | null, sql: string, args: unknown[] = []) {
  await pg.exec(`reset role;set role ${user ? "authenticated" : "anon"}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  return pg.query(sql, args);
}
async function user(metadata: unknown = {}) {
  const id = randomUUID();
  await root("insert into auth.users values($1,$2)", [
    id,
    JSON.stringify(metadata),
  ]);
  await root("insert into profiles values($1)", [id]);
  return id;
}
function choice(overrides: Record<string, unknown> = {}) {
  return {
    privacyVersion: "2026-10-29.1",
    transferVersion: "2026-10-29.1",
    termsVersion: "2026-10-29.1",
    supabase: true,
    google: false,
    github: true,
    acknowledgedAt: new Date().toISOString(),
    source: "web",
    ...overrides,
  };
}
async function record(owner: string | null, payload: unknown) {
  const result = await as(
    owner,
    "select record_legal_preferences($1::jsonb) as id",
    [JSON.stringify(payload)],
  );
  return (result.rows[0] as { id: string }).id;
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create table public.profiles(id uuid primary key references auth.users on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
  `);
  await pg.exec(migration);
});
afterAll(async () => pg.close());

it("records real boolean choices, preserves refusals, and deduplicates retries", async () => {
  const owner = await user();
  const payload = choice();
  const receipt = await record(owner, payload);
  expect(await record(owner, payload)).toBe(receipt);
  await record(owner, { ...payload, supabase: false, github: false });
  const result = await as(
    owner,
    "select * from legal_preference_receipts order by received_at",
  );
  expect(result.rows).toHaveLength(2);
  expect(result.rows[0]).toMatchObject({
    user_id: owner,
    google: false,
    supabase: true,
  });
  expect(result.rows[1]).toMatchObject({ supabase: false, github: false });
  expect(result.rows[0]).toHaveProperty("received_at");
});

it("restricts receipts to their owner and rejects guest, direct writes, and spoofed owners", async () => {
  const owner = await user();
  const other = await user();
  await record(owner, choice());
  expect(
    (await as(other, "select * from legal_preference_receipts")).rows,
  ).toEqual([]);
  await expect(record(null, choice())).rejects.toThrow();
  await expect(record(owner, choice({ user_id: other }))).rejects.toThrow();
  await expect(
    as(owner, "select append_legal_preference_receipt($1,$2::jsonb)", [
      other,
      JSON.stringify(choice()),
    ]),
  ).rejects.toThrow();
  for (const sql of [
    "delete from legal_preference_receipts",
    "update legal_preference_receipts set google=true",
    "insert into legal_preference_receipts select * from legal_preference_receipts",
  ])
    await expect(as(owner, sql)).rejects.toThrow();
  expect(
    (await as(owner, "select * from legal_preference_receipts")).rows,
  ).toHaveLength(1);
});

it("rejects malformed payloads without creating a receipt", async () => {
  const owner = await user();
  for (const payload of [
    null,
    [],
    choice({ google: "true" }),
    choice({ supabase: null }),
    choice({ privacyVersion: " " }),
    choice({ transferVersion: "x".repeat(65) }),
    choice({ termsVersion: null }),
    choice({ acknowledgedAt: "not a date" }),
    choice({ acknowledgedAt: "now" }),
    choice({ acknowledgedAt: "infinity" }),
    choice({
      acknowledgedAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    choice({ source: "unknown" }),
    choice({ received_at: "2000-01-01" }),
  ])
    await expect(record(owner, payload)).rejects.toThrow();
  expect(
    (await as(owner, "select * from legal_preference_receipts")).rows,
  ).toEqual([]);
});

it("captures explicit signup preferences once, never opts in legacy accounts, and ignores metadata edits", async () => {
  const payload = choice({ google: true, source: "native" });
  const owner = await user({ legal_preferences: payload });
  const legacy = await user({ terms_accepted: true, privacy_accepted: true });
  expect(
    (await as(legacy, "select * from legal_preference_receipts")).rows,
  ).toEqual([]);
  const first = await as(owner, "select * from legal_preference_receipts");
  expect(first.rows).toHaveLength(1);
  expect(first.rows[0]).toMatchObject({
    user_id: owner,
    source: "native",
    google: true,
  });
  await root("update auth.users set raw_user_meta_data=$2 where id=$1", [
    owner,
    JSON.stringify({ legal_preferences: choice({ google: false }) }),
  ]);
  expect(
    (await as(owner, "select * from legal_preference_receipts")).rows,
  ).toEqual(first.rows);
  await pg.exec("reset role");
  await pg.exec(migration);
  expect(
    (await as(owner, "select * from legal_preference_receipts")).rows,
  ).toEqual(first.rows);
  await root("delete from auth.users where id=$1", [owner]);
  expect(
    (
      await root("select * from legal_preference_receipts where user_id=$1", [
        owner,
      ])
    ).rows,
  ).toEqual([]);
});
