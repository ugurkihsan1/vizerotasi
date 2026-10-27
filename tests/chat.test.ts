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
      username: `chat_${++serial}`,
      display_name: "Chat fixture",
      terms_accepted: true,
      privacy_accepted: true,
    }),
  ]);
  if (role !== "user")
    await root("update profiles set role=$2 where id=$1", [id, role]);
  return id;
}
async function create(owner: string, peers: string[], title = "Fixture group") {
  const r = await as(owner, "select chat_create_private($1,$2) as id", [
    peers,
    title,
  ]);
  return (r.rows[0] as { id: string }).id;
}
async function send(
  author: string,
  room: string,
  body = "A real database fixture message.",
  nonce = randomUUID(),
) {
  await as(author, "select chat_send($1,$2,$3)", [room, body, nonce]);
  return nonce;
}
async function accept(id: string, room: string) {
  await as(id, "select chat_answer_invite($1,true)", [room]);
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
  await pg.exec(readFileSync("docs/CHAT_UPGRADE.sql", "utf8"));
});
afterAll(async () => {
  await pg.close();
});
it("requires following and explicit room entry, and revokes community access on unfollow", async () => {
  const a = await user(),
    b = await user(),
    staff = await user("admin");
  await expect(as(a, "select chat_open_community('spain')")).rejects.toThrow();
  const r = await as(a, "select chat_open_community('spain',true) as id");
  const room = (r.rows[0] as { id: string }).id;
  const mid = await send(a, room);
  expect(
    (await as(b, "select * from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(0);
  expect(
    (await as(staff, "select * from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(0);
  await as(b, "select chat_open_community('spain',true)");
  expect(
    (await as(b, "select * from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(1);
  await as(
    b,
    "delete from followed_countries where user_id=$1 and country_id='spain'",
    [b],
  );
  expect(
    (await as(b, "select * from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(0);
  await expect(send(b, room)).rejects.toThrow();
  await expect(as(null, "select * from chat_messages")).rejects.toThrow();
  await expect(
    as(null, "select chat_open_community('spain',true)"),
  ).rejects.toThrow();
});
it("keeps direct history private until acceptance and does not give staff a private-history bypass", async () => {
  const a = await user(),
    b = await user(),
    outsider = await user(),
    admin = await user("admin");
  const room = await create(a, [b]);
  const mid = await send(a, room);
  expect(
    (await as(b, "select id from chat_rooms where id=$1", [room])).rows,
  ).toHaveLength(1);
  expect(
    (await as(b, "select * from chat_messages where room_id=$1", [room])).rows,
  ).toHaveLength(0);
  expect((await as(b, "select chat_inbox() as rooms")).rows[0]).toMatchObject({
    rooms: [
      expect.objectContaining({ id: room, status: "invited", last_body: null }),
    ],
  });
  await expect(send(b, room)).rejects.toThrow();
  await expect(
    as(outsider, "select chat_answer_invite($1,true)", [room]),
  ).rejects.toThrow();
  await accept(b, room);
  expect(
    (await as(b, "select id from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(1);
  for (const id of [outsider, admin]) {
    expect(
      (await as(id, "select * from chat_rooms where id=$1", [room])).rows,
    ).toHaveLength(0);
    expect(
      (await as(id, "select * from chat_messages where room_id=$1", [room]))
        .rows,
    ).toHaveLength(0);
  }
  expect(await create(b, [a])).toBe(room);
  await expect(
    as(
      b,
      "update chat_members set last_read_at=now()+interval '1 year' where room_id=$1",
      [room],
    ),
  ).rejects.toThrow();
  await expect(
    as(
      a,
      "insert into chat_messages(room_id,sender_id,body) values($1,$2,'Forged sender')",
      [room, b],
    ),
  ).rejects.toThrow();
});
it("makes retries idempotent and prevents request spam until the invitation is accepted", async () => {
  const a = await user(),
    b = await user();
  const room = await create(a, [b]);
  const nonce = await send(a, room);
  await send(a, room, "Retry body", nonce);
  expect(
    (await as(a, "select id from chat_messages where room_id=$1", [room])).rows,
  ).toHaveLength(1);
  await send(a, room);
  await send(a, room);
  await expect(send(a, room)).rejects.toThrow();
  await accept(b, room);
  await send(a, room);
  await expect(send(a, room, " ")).rejects.toThrow();
  await expect(send(a, room, "a".repeat(2001))).rejects.toThrow();
  await as(b, "select chat_block_user($1)", [a]);
  await expect(send(a, room)).rejects.toThrow();
  await expect(send(b, room)).rejects.toThrow();
  await expect(create(a, [b])).rejects.toThrow();
  expect((await as(a, "select * from chat_blocks")).rows).toHaveLength(0);
  await as(b, "select chat_block_user($1,false)", [a]);
  await send(a, room);
});
it("supports groups, consent for added participants, owner transfer and removal", async () => {
  const a = await user(),
    b = await user(),
    c = await user(),
    d = await user();
  const room = await create(a, [b, c]);
  await accept(b, room);
  const mid = await send(a, room);
  await expect(
    as(b, "select chat_invite_members($1,$2)", [room, [d]]),
  ).rejects.toThrow();
  await as(a, "select chat_invite_members($1,$2)", [room, [d]]);
  expect(
    (await as(d, "select * from chat_messages where room_id=$1", [room])).rows,
  ).toHaveLength(0);
  await accept(d, room);
  expect(
    (await as(d, "select id from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(1);
  await as(a, "select chat_leave($1,$2)", [room, b]);
  expect(
    (await as(b, "select * from chat_messages where room_id=$1", [room])).rows,
  ).toHaveLength(0);
  await expect(send(b, room)).rejects.toThrow();
  await as(a, "select chat_leave($1)", [room]);
  expect(
    (await as(d, "select created_by from chat_rooms where id=$1", [room]))
      .rows[0],
  ).toMatchObject({ created_by: d });
  await as(d, "select chat_close_group($1)", [room]);
  await expect(send(d, room)).rejects.toThrow();
  expect(
    (await as(d, "select id from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(1);
});
it("limits groups to ten and prevents reinviting declined people", async () => {
  const a = await user(),
    peers = await Promise.all(Array.from({ length: 10 }, () => user()));
  await expect(create(a, peers)).rejects.toThrow();
  const room = await create(a, peers.slice(0, 9));
  await expect(
    as(a, "select chat_invite_members($1,$2)", [room, [peers[9]]]),
  ).rejects.toThrow();
  await as(peers[0], "select chat_answer_invite($1,false)", [room]);
  await expect(
    as(a, "select chat_invite_members($1,$2)", [room, [peers[0]]]),
  ).rejects.toThrow();
});
it("only shares a reported message snapshot with staff and allows reviewed removal", async () => {
  const a = await user(),
    b = await user(),
    staff = await user("moderator"),
    outsider = await user();
  const room = await create(a, [b]);
  await accept(b, room);
  const mid = await send(a, room, "Reported fixture");
  const secret = await send(a, room, "Other private fixture");
  await expect(
    as(outsider, "select chat_report_message($1,'Spam')", [mid]),
  ).rejects.toThrow();
  await expect(
    as(a, "select chat_report_message($1,'Spam')", [mid]),
  ).rejects.toThrow();
  await as(b, "select chat_report_message($1,'Spam')", [mid]);
  await as(b, "select chat_report_message($1,'Spam')", [mid]);
  const reports = (
    await as(staff, "select * from chat_reports where message_id=$1", [mid])
  ).rows;
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({ body_snapshot: "Reported fixture" });
  expect(
    (await as(staff, "select * from chat_messages where id=$1", [secret])).rows,
  ).toHaveLength(0);
  expect((await as(outsider, "select * from chat_reports")).rows).toHaveLength(
    0,
  );
  const report = (reports[0] as { id: string }).id;
  await expect(
    as(b, "select chat_review_report($1,true)", [report]),
  ).rejects.toThrow();
  await as(staff, "select chat_review_report($1,true)", [report]);
  expect(
    (await as(b, "select body from chat_messages where id=$1", [mid])).rows[0],
  ).toMatchObject({ body: "" });
  await expect(
    as(b, "select chat_hide_message($1)", [secret]),
  ).rejects.toThrow();
  await as(a, "select chat_hide_message($1)", [secret]);
});
it("counts unread messages and marks them read only through the current member", async () => {
  const a = await user(),
    b = await user(),
    other = await user();
  const room = await create(a, [b]);
  expect(
    (await as(b, "select chat_unread_count() as n")).rows[0],
  ).toMatchObject({ n: 1 });
  await accept(b, room);
  const mid = await send(a, room);
  expect(
    (await as(b, "select chat_unread_count() as n")).rows[0],
  ).toMatchObject({ n: 1 });
  await expect(
    as(other, "select chat_mark_read($1)", [room]),
  ).rejects.toThrow();
  await as(b, "select chat_mark_read($1)", [room]);
  expect(
    (await as(b, "select chat_unread_count() as n")).rows[0],
  ).toMatchObject({ n: 0 });
  await root("select 1");
  await pg.exec(readFileSync("docs/CHAT_UPGRADE.sql", "utf8"));
  expect(
    (await as(b, "select id from chat_messages where id=$1", [mid])).rows,
  ).toHaveLength(1);
});
it("enforces creation and message rate limits without letting clients forge members", async () => {
  const a = await user();
  const peers = await Promise.all(Array.from({ length: 11 }, () => user()));
  for (const peer of peers.slice(0, 10)) await create(a, [peer]);
  await expect(create(a, [peers[10]])).rejects.toThrow();
  const writer = await user();
  const opened = await as(
    writer,
    "select chat_open_community('estonia',true) as id",
  );
  const room = (opened.rows[0] as { id: string }).id;
  await expect(
    as(
      a,
      "insert into chat_members(room_id,user_id,status) values($1,$2,'active')",
      [room, a],
    ),
  ).rejects.toThrow();
  for (let n = 0; n < 60; n++) await send(writer, room, `Fixture ${n}`);
  await expect(send(writer, room)).rejects.toThrow();
  await expect(
    as(a, "select chat_pair_blocked($1,$2)", [writer, peers[0]]),
  ).rejects.toThrow();
});
it("allows community staff moderation but never deletion of arbitrary private messages", async () => {
  const a = await user(),
    staff = await user("moderator"),
    b = await user();
  const opened = await as(a, "select chat_open_community('france',true) as id");
  const room = (opened.rows[0] as { id: string }).id;
  const mid = await send(a, room);
  await expect(
    as(staff, "select chat_hide_message($1)", [mid]),
  ).rejects.toThrow();
  await as(staff, "select chat_open_community('france',true)");
  await as(staff, "select chat_hide_message($1)", [mid]);
  expect(
    (await as(a, "select hidden_at from chat_messages where id=$1", [mid]))
      .rows[0],
  ).toMatchObject({ hidden_at: expect.anything() });
  const privateRoom = await create(a, [staff]);
  await accept(staff, privateRoom);
  const privateId = await send(a, privateRoom);
  await expect(
    as(staff, "select chat_hide_message($1)", [privateId]),
  ).rejects.toThrow();
  const group = await create(b, [a, staff]);
  await as(b, "select chat_leave($1)", [group]);
  expect(
    (await as(a, "select * from chat_rooms where id=$1", [group])).rows,
  ).toHaveLength(0);
});
it("does not expose new read receipts or unread alerts while a direct pair is blocked", async () => {
  const a = await user(),
    b = await user();
  const room = await create(a, [b]);
  await accept(b, room);
  await send(a, room);
  const before = (
    await as(
      b,
      "select last_read_at from chat_members where room_id=$1 and user_id=$2",
      [room, b],
    )
  ).rows[0];
  await as(b, "select chat_block_user($1)", [a]);
  await as(b, "select chat_mark_read($1)", [room]);
  expect(
    (
      await as(
        b,
        "select last_read_at from chat_members where room_id=$1 and user_id=$2",
        [room, b],
      )
    ).rows[0],
  ).toEqual(before);
  expect(
    (await as(b, "select chat_unread_count() as n")).rows[0],
  ).toMatchObject({ n: 0 });
  await as(b, "select chat_block_user($1,false)", [a]);
  await as(b, "select chat_mark_read($1)", [room]);
  expect(
    (
      await as(
        b,
        "select last_read_at from chat_members where room_id=$1 and user_id=$2",
        [room, b],
      )
    ).rows[0],
  ).not.toEqual(before);
});
