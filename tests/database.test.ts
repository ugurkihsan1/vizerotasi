import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
let pg: PGlite;
const a = "00000000-0000-0000-0000-000000000001",
  b = "00000000-0000-0000-0000-000000000002",
  mod = "00000000-0000-0000-0000-000000000003";
let post: string, comment: string;
async function as(user: string | null, sql: string, params: unknown[] = []) {
  await pg.exec(`reset role; set role ${user ? "authenticated" : "anon"};`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  return pg.query(sql, params);
}
async function root(sql: string, params: unknown[] = []) {
  await pg.exec("reset role");
  return pg.query(sql, params);
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`
 create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
 alter default privileges in schema public grant usage,select on sequences to anon,authenticated;
 `);
  await pg.exec(
    readFileSync("supabase/migrations/202610220001_community.sql", "utf8"),
  );
  await pg.exec(
    readFileSync("supabase/migrations/202610220002_spain_tourism.sql", "utf8"),
  );
  await pg.exec(
    readFileSync("supabase/migrations/202610220002_spain_tourism.sql", "utf8"),
  );
  for (const [id, name] of [
    [a, "alice"],
    [b, "bob"],
    [mod, "moderator"],
  ])
    await root("insert into auth.users values($1,$2)", [
      id,
      JSON.stringify({
        username: name,
        display_name: name,
        terms_accepted: true,
        privacy_accepted: true,
      }),
    ]);
  await root("update profiles set role='moderator' where id=$1", [mod]);
});
afterAll(async () => {
  await pg.close();
});
describe("PostgreSQL RLS and trusted workflow", () => {
  it("seeds nine countries for guests", async () => {
    expect((await as(null, "select * from countries")).rows).toHaveLength(9);
  });
  it("rejects guest content writes", async () => {
    await expect(
      as(
        null,
        "insert into posts(user_id,country_id,kind,title,body) values($1,'estonia','question','Guest post','This body is long enough for validation')",
        [a],
      ),
    ).rejects.toThrow();
  });
  it("creates a pending visa experience", async () => {
    const r = await as(
      a,
      "insert into posts(user_id,country_id,kind,title,body,city,result,first_schengen,employment_status,financing) values($1,'estonia','experience','İlk Schengen deneyimim','Gerçek deneyim metni en az yirmi karakter.','İstanbul','approved',true,'Çalışan','Kendim') returning id,status",
      [a],
    );
    post = (r.rows[0] as { id: string }).id;
    expect(r.rows[0]).toMatchObject({ status: "pending" });
  });
  it("lets only author and staff read pending content", async () => {
    expect(
      (await as(a, "select * from posts where id=$1", [post])).rows,
    ).toHaveLength(1);
    expect(
      (await as(b, "select * from posts where id=$1", [post])).rows,
    ).toHaveLength(0);
    expect((await as(null, "select * from feed")).rows).toHaveLength(0);
    expect(
      (await as(mod, "select * from posts where id=$1", [post])).rows,
    ).toHaveLength(1);
  });
  it("blocks impersonation and pre-approved writes", async () => {
    await expect(
      as(
        b,
        "insert into posts(user_id,country_id,kind,title,body) values($1,'estonia','question','Impersonated','This body is long enough for validation')",
        [a],
      ),
    ).rejects.toThrow();
    await expect(
      as(
        a,
        "insert into posts(user_id,country_id,kind,title,body,status) values($1,'estonia','question','Approved','This body is long enough for validation','approved')",
        [a],
      ),
    ).rejects.toThrow();
  });
  it("blocks role, reputation and membership escalation", async () => {
    for (const assignment of [
      "role='admin'",
      "reputation=9999",
      "membership_level='Topluluk Uzmanı'",
    ])
      await expect(
        as(a, `update profiles set ${assignment} where id=$1`, [a]),
      ).rejects.toThrow();
  });
  it("blocks direct approval and moderator RPC for ordinary users", async () => {
    await expect(
      as(a, "update posts set status='approved' where id=$1", [post]),
    ).rejects.toThrow();
    await expect(
      as(a, "select moderate($1,'approved')", [post]),
    ).rejects.toThrow();
  });
  it("approves atomically with one reputation award", async () => {
    await as(mod, "select moderate($1,'approved')", [post]);
    await as(mod, "select moderate($1,'approved')", [post]);
    expect(
      (await as(a, "select reputation from profiles where id=$1", [a])).rows[0],
    ).toMatchObject({ reputation: 8 });
    expect(
      (await as(null, "select * from feed where id=$1", [post])).rows,
    ).toHaveLength(1);
    expect((await as(a, "select * from notifications")).rows).toHaveLength(2);
  });
  it("does not award again after reject and reapprove", async () => {
    await as(mod, "select moderate($1,'rejected')", [post]);
    await as(mod, "select moderate($1,'approved')", [post]);
    expect(
      (await as(a, "select reputation from profiles where id=$1", [a])).rows[0],
    ).toMatchObject({ reputation: 8 });
  });
  it("keeps moderation notes and notifications private", async () => {
    expect((await as(b, "select * from notifications")).rows).toHaveLength(0);
    expect((await as(a, "select * from moderation_actions")).rows).toHaveLength(
      0,
    );
  });
  it("prevents guest comments and author spoofing", async () => {
    await expect(
      as(
        null,
        "insert into comments(post_id,user_id,body) values($1,$2,'Guest comment')",
        [post, a],
      ),
    ).rejects.toThrow();
    await expect(
      as(
        b,
        "insert into comments(post_id,user_id,body) values($1,$2,'Spoofed comment')",
        [post, a],
      ),
    ).rejects.toThrow();
  });
  it("moderates a comment and awards two points", async () => {
    const r = await as(
      b,
      "insert into comments(post_id,user_id,body) values($1,$2,'Bu deneyim çok yardımcı oldu.') returning id",
      [post, b],
    );
    comment = (r.rows[0] as { id: string }).id;
    expect((await as(a, "select * from comments")).rows).toHaveLength(0);
    expect((await as(b, "select * from comments")).rows).toHaveLength(1);
    await as(mod, "select moderate($1,'approved',true)", [comment]);
    expect((await as(null, "select * from comments")).rows).toHaveLength(1);
    expect(
      (await as(b, "select reputation from profiles where id=$1", [b])).rows[0],
    ).toMatchObject({ reputation: 2 });
  });
  it("notifies the post author about approved replies", async () => {
    expect(
      (await as(a, "select * from notifications where message like '%yanıt%'"))
        .rows,
    ).toHaveLength(1);
  });
  it("rejects own helpful votes and duplicate votes", async () => {
    await expect(
      as(a, "insert into helpful_votes(user_id,post_id) values($1,$2)", [
        a,
        post,
      ]),
    ).rejects.toThrow();
    await as(b, "insert into helpful_votes(user_id,post_id) values($1,$2)", [
      b,
      post,
    ]);
    await expect(
      as(b, "insert into helpful_votes(user_id,post_id) values($1,$2)", [
        b,
        post,
      ]),
    ).rejects.toThrow();
    expect(
      (await as(null, "select helpful_count from feed where id=$1", [post]))
        .rows[0],
    ).toMatchObject({ helpful_count: 1 });
  });
  it("allows helpful toggle removal without reputation farming", async () => {
    await as(b, "delete from helpful_votes where user_id=$1 and post_id=$2", [
      b,
      post,
    ]);
    expect(
      (await as(a, "select reputation from profiles where id=$1", [a])).rows[0],
    ).toMatchObject({ reputation: 8 });
  });
  it("keeps saves private and unique", async () => {
    await as(b, "insert into saved_items(user_id,post_id) values($1,$2)", [
      b,
      post,
    ]);
    await expect(
      as(b, "insert into saved_items(user_id,post_id) values($1,$2)", [
        b,
        post,
      ]),
    ).rejects.toThrow();
    expect((await as(a, "select * from saved_items")).rows).toHaveLength(0);
  });
  it("prevents duplicate follows", async () => {
    await as(b, "insert into followed_countries values($1,'estonia')", [b]);
    await expect(
      as(b, "insert into followed_countries values($1,'estonia')", [b]),
    ).rejects.toThrow();
  });
  it("blocks notification forgery", async () => {
    await expect(
      as(b, "insert into notifications(user_id,message) values($1,'forged')", [
        a,
      ]),
    ).rejects.toThrow();
  });
  it("restricts reports to reporter and staff", async () => {
    await as(
      b,
      "insert into reports(user_id,post_id,reason) values($1,$2,'Yanlış bilgi')",
      [b, post],
    );
    expect((await as(a, "select * from reports")).rows).toHaveLength(0);
    expect((await as(mod, "select * from reports")).rows).toHaveLength(1);
  });
  it("blocks admin functions for moderators", async () => {
    await expect(
      as(mod, "select admin_set_role($1,'admin')", [a]),
    ).rejects.toThrow();
    await expect(
      as(mod, "select admin_adjust_reputation($1,500,'invalid bonus','test')", [
        a,
      ]),
    ).rejects.toThrow();
  });
  it("blocks staff approval of own content", async () => {
    const r = await as(
      mod,
      "insert into posts(user_id,country_id,kind,title,body) values($1,'estonia','question','Moderator question','A long enough question from moderator.') returning id",
      [mod],
    );
    await expect(
      as(mod, "select moderate($1,'approved')", [
        (r.rows[0] as { id: string }).id,
      ]),
    ).rejects.toThrow();
  });
  it("does not accept a third reply nesting level", async () => {
    const r = await as(
      a,
      "insert into comments(post_id,user_id,parent_comment_id,body) values($1,$2,$3,'A direct reply') returning id",
      [post, a, comment],
    );
    const id = (r.rows[0] as { id: string }).id;
    await as(mod, "select moderate($1,'approved',true)", [id]);
    await expect(
      as(
        b,
        "insert into comments(post_id,user_id,parent_comment_id,body) values($1,$2,$3,'Too deep')",
        [post, b, id],
      ),
    ).rejects.toThrow();
  });
  it("blocks self and duplicate comment helpful votes", async () => {
    await expect(
      as(b, "insert into comment_helpful_votes values($1,$2)", [b, comment]),
    ).rejects.toThrow();
    await as(a, "insert into comment_helpful_votes values($1,$2)", [
      a,
      comment,
    ]);
    await expect(
      as(a, "insert into comment_helpful_votes values($1,$2)", [a, comment]),
    ).rejects.toThrow();
  });
  it("requires admin authorization for source verification", async () => {
    await expect(
      as(
        a,
        "select admin_edit_tip($1,'Verified title','A long enough verified body','official','https://example.com')",
        [post],
      ),
    ).rejects.toThrow();
  });
  it("enforces server-side submission limits", async () => {
    for (let n = 0; n < 9; n++)
      await as(
        a,
        "insert into posts(user_id,country_id,kind,title,body) values($1,'estonia','question','Rate test','A long enough body for rate limiting')",
        [a],
      );
    await expect(
      as(
        a,
        "insert into posts(user_id,country_id,kind,title,body) values($1,'estonia','question','Rate test','A long enough body for rate limiting')",
        [a],
      ),
    ).rejects.toThrow();
  });
  it("seeds Spain source data idempotently without touching other countries", async () => {
    const r = await as(
      null,
      "select * from country_documents where country_id='spain' order by sort_order",
    );
    expect(r.rows).toHaveLength(13);
    expect(r.rows[0]).toMatchObject({
      sort_order: 1,
      source_type: "application_center",
      source_updated_at: null,
    });
    expect(
      (
        await as(
          null,
          "select * from country_documents where country_id<>'spain'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("does not let ordinary users edit source metadata", async () => {
    await as(
      a,
      "update country_documents set source_scope='forged' where country_id='spain'",
    );
    expect(
      (
        await as(
          null,
          "select * from country_documents where source_scope='forged'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("has RLS on every application table", async () => {
    const r = await root(
      "select relname from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and not relrowsecurity",
    );
    expect(r.rows).toHaveLength(0);
  });
});
