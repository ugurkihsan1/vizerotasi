import { beforeAll, afterAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
let pg: PGlite;
let serial = 0;
async function root(sql: string, args: unknown[] = []) {
  await pg.exec("reset role");
  return pg.query(sql, args);
}
async function as(id: string | null, sql: string, args: unknown[] = []) {
  await pg.exec(`reset role;set role ${id ? "authenticated" : "anon"}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id ?? "",
  ]);
  return pg.query(sql, args);
}
async function user(role = "user") {
  const id = randomUUID();
  await root("insert into auth.users values($1,$2)", [
    id,
    JSON.stringify({
      username: `group_${++serial}`,
      display_name: "Chat fixture",
      terms_accepted: true,
      privacy_accepted: true,
    }),
  ]);
  if (role !== "user")
    await root("update profiles set role=$2 where id=$1", [id, role]);
  return id;
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
alter default privileges in schema public grant usage,select on sequences to anon,authenticated;
`);
  await pg.exec(
    readFileSync("supabase/migrations/202610220001_community.sql", "utf8"),
  );
  await pg.exec(readFileSync("docs/GROUPS_UPGRADE.sql", "utf8"));
});
afterAll(async () => {
  await pg.close();
});

async function create(owner: string, name = "Erasmus öğrencileri") {
  const r = await as(
    owner,
    "select sharing_create($1,'Öğrenci hazırlığı') as id",
    [name],
  );
  return (r.rows[0] as { id: string }).id;
}
async function join(owner: string, member: string, gid: string) {
  await as(member, "select sharing_request($1)", [gid]);
  await as(owner, "select sharing_manage($1,$2,'approve')", [gid, member]);
}
async function publish(
  author: string,
  gid: string,
  body = "Konaklama konusunda deneyim paylaşımı",
  nonce = randomUUID(),
) {
  await as(author, "select sharing_publish($1,$2,$3)", [gid, body, nonce]);
  return nonce;
}
it("seeds Erasmus once and keeps metadata discoverable without exposing membership or content", async () => {
  const r = await as(null, "select sharing_directory() as data");
  const groups = (r.rows[0] as { data: { name: string }[] }).data;
  expect(groups.filter((g) => g.name === "Erasmus")).toHaveLength(1);
  await expect(
    as(null, "select sharing_create('Guest group')"),
  ).rejects.toThrow();
  const owner = await user(),
    outsider = await user(),
    g = await create(owner),
    post = await publish(owner, g);
  expect(
    (
      await as(outsider, "select * from sharing_group_posts where id=$1", [
        post,
      ])
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        outsider,
        "select * from sharing_group_members where group_id=$1",
        [g],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(as(outsider, "select sharing_feed($1)", [g])).rejects.toThrow();
  await pg.exec("reset role");
  await pg.exec(readFileSync("docs/GROUPS_UPGRADE.sql", "utf8"));
  expect(
    (
      await as(
        null,
        "select count(*)::int as n from sharing_groups where is_system",
      )
    ).rows[0],
  ).toEqual({ n: 1 });
});
it("requires manager approval before reading, posting, commenting or liking and revokes access on removal", async () => {
  const owner = await user(),
    member = await user(),
    g = await create(owner),
    post = await publish(owner, g);
  await as(member, "select sharing_request($1)", [g]);
  await expect(as(member, "select sharing_feed($1)", [g])).rejects.toThrow();
  await expect(publish(member, g)).rejects.toThrow();
  await expect(
    as(member, "select sharing_comment($1,'test',$2)", [post, randomUUID()]),
  ).rejects.toThrow();
  await expect(
    as(member, "select sharing_like($1,true)", [post]),
  ).rejects.toThrow();
  await as(owner, "select sharing_manage($1,$2,'approve')", [g, member]);
  expect(
    (await as(member, "select sharing_feed($1) as posts", [g])).rows[0],
  ).toMatchObject({ posts: [{ id: post }] });
  await publish(member, g);
  await as(member, "select sharing_like($1,true)", [post]);
  await as(owner, "select sharing_manage($1,$2,'remove')", [g, member]);
  expect(
    (
      await as(member, "select * from sharing_group_posts where group_id=$1", [
        g,
      ])
    ).rows,
  ).toHaveLength(0);
  await expect(publish(member, g)).rejects.toThrow();
  await expect(as(member, "select sharing_request($1)", [g])).rejects.toThrow();
  await as(owner, "select sharing_manage($1,$2,'unban')", [g, member]);
  await as(member, "select sharing_request($1)", [g]);
  expect(
    (
      await as(
        member,
        "select status from sharing_group_members where group_id=$1",
        [g],
      )
    ).rows[0],
  ).toMatchObject({ status: "pending" });
});
it("keeps generic staff outside private groups while Erasmus is managed by staff", async () => {
  const owner = await user(),
    staff = await user("admin"),
    member = await user(),
    g = await create(owner);
  await publish(owner, g);
  await expect(as(staff, "select sharing_feed($1)", [g])).rejects.toThrow();
  await expect(
    as(staff, "select sharing_manage($1,$2,'approve')", [g, member]),
  ).rejects.toThrow();
  const erasmus = "00000000-0000-0000-0000-00000000e001";
  await join(staff, member, erasmus);
  await publish(member, erasmus);
  expect(
    (await as(staff, "select sharing_feed($1) as posts", [erasmus])).rows[0],
  ).toMatchObject({ posts: [{ user_id: member }] });
});
it("prevents membership escalation and manager takeover; supports explicit ownership transfer", async () => {
  const owner = await user(),
    manager = await user(),
    member = await user(),
    g = await create(owner);
  await join(owner, manager, g);
  await join(owner, member, g);
  await expect(
    as(
      member,
      "update sharing_group_members set role='manager' where group_id=$1",
      [g],
    ),
  ).rejects.toThrow();
  await expect(
    as(member, "select sharing_manage($1,$2,'manager')", [g, member]),
  ).rejects.toThrow();
  await as(owner, "select sharing_manage($1,$2,'manager')", [g, manager]);
  await expect(
    as(manager, "select sharing_manage($1,$2,'manager')", [g, member]),
  ).rejects.toThrow();
  await expect(
    as(manager, "select sharing_manage($1,$2,'remove')", [g, owner]),
  ).rejects.toThrow();
  await expect(as(owner, "select sharing_leave($1)", [g])).rejects.toThrow();
  await as(owner, "select sharing_manage($1,$2,'transfer')", [g, member]);
  expect(
    (await as(member, "select owner_id from sharing_groups where id=$1", [g]))
      .rows[0],
  ).toEqual({ owner_id: member });
  await as(member, "select sharing_manage($1,$2,'member')", [g, owner]);
  await as(owner, "select sharing_leave($1)", [g]);
  await expect(as(owner, "select sharing_feed($1)", [g])).rejects.toThrow();
});
it("deduplicates post/comment retries, counts likes once, enforces author deletion and group isolation", async () => {
  const owner = await user(),
    member = await user(),
    other = await user(),
    g = await create(owner),
    h = await create(other);
  await join(owner, member, g);
  const p = await publish(member, g);
  await publish(member, g, "Retry", p);
  const c = randomUUID();
  await as(owner, "select sharing_comment($1,'Yardımcı yorum',$2)", [p, c]);
  await as(owner, "select sharing_comment($1,'Yardımcı yorum',$2)", [p, c]);
  await as(owner, "select sharing_like($1,true)", [p]);
  await as(owner, "select sharing_like($1,true)", [p]);
  expect(
    (await as(member, "select sharing_feed($1) as posts", [g])).rows[0],
  ).toMatchObject({ posts: [{ id: p, like_count: 1, comment_count: 1 }] });
  expect(
    (await as(other, "select * from sharing_group_comments where id=$1", [c]))
      .rows,
  ).toHaveLength(0);
  await expect(as(other, "select sharing_delete($1)", [p])).rejects.toThrow();
  await expect(
    as(other, "select sharing_publish($1,'Forge author',$2)", [h, p]),
  ).rejects.toThrow();
  await expect(
    as(member, "select sharing_delete($1,true)", [c]),
  ).rejects.toThrow();
  await as(owner, "select sharing_delete($1,true)", [c]);
  await as(member, "select sharing_delete($1)", [p]);
  expect(
    (await as(owner, "select * from sharing_group_posts where id=$1", [p]))
      .rows,
  ).toHaveLength(0);
});
it("never autoaccepts pending or declined requests, permits cancel/leave and preserves old posts", async () => {
  const owner = await user(),
    member = await user(),
    g = await create(owner);
  await as(member, "select sharing_request($1)", [g]);
  await as(member, "select sharing_request($1)", [g]);
  await as(owner, "select sharing_manage($1,$2,'decline')", [g, member]);
  await expect(publish(member, g)).rejects.toThrow();
  await as(member, "select sharing_request($1)", [g]);
  await as(member, "select sharing_leave($1)", [g]);
  await expect(
    as(owner, "select sharing_manage($1,$2,'approve')", [g, member]),
  ).rejects.toThrow();
  await join(owner, member, g);
  const post = await publish(member, g);
  await as(member, "select sharing_leave($1)", [g]);
  await expect(as(member, "select sharing_feed($1)", [g])).rejects.toThrow();
  expect(
    (await as(owner, "select id from sharing_group_posts where id=$1", [post]))
      .rows,
  ).toHaveLength(1);
});
it("limits repeated group creation and disallows direct forged writes", async () => {
  const owner = await user();
  for (let i = 0; i < 5; i++) await create(owner);
  await expect(create(owner)).rejects.toThrow(/rate limit/);
  await expect(
    as(
      owner,
      "insert into sharing_groups(name,owner_id,is_system) values('Forged',$1,true)",
      [owner],
    ),
  ).rejects.toThrow();
  await expect(
    as(
      owner,
      "insert into sharing_group_posts(group_id,user_id,body) select id,$1,'forged' from sharing_groups limit 1",
      [owner],
    ),
  ).rejects.toThrow();
});
