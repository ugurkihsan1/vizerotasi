import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
let pg: PGlite;
let serial = 0;
async function root(sql: string, args: unknown[] = []) {
  await pg.exec("reset role");
  return pg.query(sql, args);
}
async function as(user: string | null, sql: string, args: unknown[] = []) {
  await pg.exec(`reset role;set role ${user ? "authenticated" : "anon"}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user ?? "",
  ]);
  return pg.query(sql, args).catch((error: Error) => {
    error.message = `${sql}: ${error.message}`;
    throw error;
  });
}
async function user(age = 10, role = "user") {
  const id = randomUUID();
  await root("insert into auth.users values($1,$2)", [
    id,
    JSON.stringify({
      username: `fixture_${++serial}`,
      display_name: "Fixture member",
      terms_accepted: true,
      privacy_accepted: true,
    }),
  ]);
  await root(
    "update profiles set created_at=now()-($2::integer*interval '1 day'),role=$3 where id=$1",
    [id, age, role],
  );
  return id;
}
async function post(
  author: string,
  country = "estonia",
  kind = "experience",
  category: string | null = null,
  sample = false,
) {
  const r = await root(
    "insert into posts(user_id,country_id,kind,title,body,city,result,first_schengen,employment_status,financing,status,category_id,is_sample,created_at) values($1,$2,$3,'Fixture contribution','This is a historical, approved database test fixture.','İstanbul','approved',true,'Çalışan','Kendim','approved',$4,$5,now()-interval '2 days') returning id",
    [author, country, kind, category, sample],
  );
  return (r.rows[0] as { id: string }).id;
}
async function comment(author: string, source: string) {
  const r = await root(
    "insert into comments(user_id,post_id,body,status) values($1,$2,'A useful approved comment fixture.','approved') returning id",
    [author, source],
  );
  return (r.rows[0] as { id: string }).id;
}
async function metrics(id: string) {
  return (await root("select * from profiles where id=$1", [id])).rows[0] as {
    badge_score: number;
    membership_level: string;
    member_number: number;
    is_pioneer: boolean;
    reputation_metrics: Record<string, number>;
  };
}
async function awardIds(id: string) {
  return (
    await as(id, "select badge_id from user_badges where user_id=$1", [id])
  ).rows.map((r) => (r as { badge_id: string }).badge_id);
}
async function gezginFixture() {
  const author = await user(40);
  const sourceUser = await user(60);
  const source = await post(sourceUser);
  const e1 = await post(author);
  await post(author);
  const c1 = await comment(author, source),
    c2 = await comment(author, source);
  const v1 = await user(10),
    v2 = await user(10);
  await post(v1, "estonia", "question");
  await post(v2, "estonia", "question");
  for (const [v, c] of [
    [v1, c1],
    [v1, c2],
    [v2, c1],
  ])
    await as(v, "insert into comment_helpful_votes values($1,$2)", [v, c]);
  return { author, e1, c1, c2, v1, v2 };
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
 create table storage.objects(id uuid primary key,bucket_id text,name text,metadata jsonb);
 grant usage on schema storage to anon,authenticated;
 grant select,insert,delete on storage.objects to anon,authenticated;
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;
 alter default privileges in schema public grant usage,select on sequences to anon,authenticated;
 `);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await pg.exec(
      readFileSync(
        file.includes("004")
          ? "docs/COMMUNITY_UPGRADE.sql"
          : `supabase/migrations/${file}`,
        "utf8",
      ),
    );
});
afterAll(async () => {
  await pg.close();
});
it("assigns durable pioneer numbers without trusting signup metadata", async () => {
  const id = await user();
  const p = await metrics(id);
  expect(p.is_pioneer).toBe(true);
  expect(p.membership_level).toBe("Öncü Üye");
  expect(await awardIds(id)).toContain("pioneer-member");
});
it("blocks forged badge points, rank, cohort and internal refresh calls", async () => {
  const id = await user();
  for (const set of [
    "badge_score=99999",
    "membership_level='Büyükelçi'",
    "member_number=1",
    "reputation_metrics='{}'::jsonb",
    "created_at='2000-01-01'",
  ])
    await expect(
      as(id, `update profiles set ${set} where id=$1`, [id]),
    ).rejects.toThrow();
  await expect(
    as(id, "select refresh_member_progress($1)", [id]),
  ).rejects.toThrow();
  await expect(
    as(id, "select nextval('public.member_number_seq')"),
  ).rejects.toThrow();
  await as(id, "select refresh_my_progress()");
});
it("awards Gezgin from quality votes and multiple real experiences, and downgrades when a gate is lost", async () => {
  const f = await gezginFixture();
  expect((await metrics(f.author)).membership_level).toBe("Gezgin");
  expect((await metrics(f.author)).reputation_metrics).toMatchObject({
    approved_experiences: 2,
    liked_comments: 2,
    qualified_comment_votes: 3,
    unique_supporters: 2,
  });
  await as(
    f.v1,
    "delete from comment_helpful_votes where user_id=$1 and comment_id=$2",
    [f.v1, f.c2],
  );
  const p = await metrics(f.author);
  expect(p.badge_score).toBeGreaterThan(40);
  expect(p.membership_level).toBe("Öncü Üye");
  expect(await awardIds(f.author)).not.toContain("gezgin");
});
it("does not count new-account vote rings or samples toward quality", async () => {
  const author = await user();
  await post(author);
  await post(author);
  const source = await post(await user());
  const c = await comment(author, source);
  const fresh = await user(0);
  await post(fresh, "estonia", "question");
  await as(fresh, "insert into comment_helpful_votes values($1,$2)", [
    fresh,
    c,
  ]);
  await post(author, "france", "experience", null, true);
  expect((await metrics(author)).reputation_metrics).toMatchObject({
    approved_experiences: 2,
    experience_countries: 1,
    qualified_comment_votes: 0,
  });
});
it("requires experience diversity: five different Schengen countries earns Avrupa Fatihi", async () => {
  const id = await user();
  await root(
    "insert into countries(id,name,code,flag,is_schengen) values('united-kingdom','Birleşik Krallık','GB','🇬🇧',false) on conflict do nothing",
  );
  for (const c of ["estonia", "germany", "france", "italy", "united-kingdom"])
    await post(id, c);
  expect(await awardIds(id)).not.toContain("europe-conqueror");
  await post(id, "spain");
  expect(await awardIds(id)).toContain("europe-conqueror");
  await post(id, "spain");
  expect((await metrics(id)).reputation_metrics.experience_countries).toBe(5);
});
it("counts different newcomers rather than repeated welcomes to one account", async () => {
  const helper = await user(60);
  for (let i = 0; i < 3; i++) {
    const newcomer = await user(0);
    const source = await post(newcomer);
    await comment(helper, source);
    if (i === 0) {
      await comment(helper, source);
      expect(await awardIds(helper)).not.toContain("travel-companion");
    }
  }
  expect(await awardIds(helper)).toContain("travel-companion");
  expect((await metrics(helper)).reputation_metrics.welcomed_members).toBe(3);
});
it("gives Dedektif for approved appointment information, not for asking questions", async () => {
  const id = await user();
  for (let i = 0; i < 3; i++)
    await post(id, "estonia", "question", "appointment");
  expect(await awardIds(id)).not.toContain("appointment-detective");
  for (let i = 0; i < 3; i++) await post(id, "estonia", "tip", "appointment");
  expect(await awardIds(id)).toContain("appointment-detective");
});
it("does not promote a member on raw points alone", async () => {
  const id = await user(400),
    admin = await user(400, "admin");
  await post(id, "estonia", "question");
  await as(
    admin,
    "select admin_adjust_reputation($1,99999,'Verified fixture bonus','quality-gates-test')",
    [id],
  );
  const p = await metrics(id);
  expect(p.badge_score).toBeGreaterThan(8000);
  expect(p.membership_level).toBe("Öncü Üye");
});
it("queues independent reports without automatic punishment; confirmed penalties are private and idempotent", async () => {
  const f = await gezginFixture();
  const before = await metrics(f.author);
  let reportId = "";
  for (let i = 0; i < 3; i++) {
    const reporter = await user();
    const r = await as(
      reporter,
      "insert into reports(user_id,post_id,reason) values($1,$2,'Yanlış bilgi') returning id",
      [reporter, f.e1],
    );
    reportId = (r.rows[0] as { id: string }).id;
  }
  expect((await metrics(f.author)).badge_score).toBe(before.badge_score);
  const admin = await user(40, "admin");
  expect(
    (
      await as(admin, "select * from member_feedback_queue where user_id=$1", [
        f.author,
      ])
    ).rows[0],
  ).toMatchObject({ reporters: 3 });
  expect(
    (await as(f.v1, "select * from member_feedback_queue")).rows,
  ).toHaveLength(0);
  await expect(
    as(f.v1, "select review_member_report($1,true,50,'Untrusted review')", [
      reportId,
    ]),
  ).rejects.toThrow();
  await as(
    admin,
    "select review_member_report($1,true,50,'Confirmed misleading content')",
    [reportId],
  );
  await as(
    admin,
    "select review_member_report($1,true,50,'Repeat must do nothing')",
    [reportId],
  );
  const after = await metrics(f.author);
  expect(after.badge_score).toBe(before.badge_score - 50);
  expect(after.membership_level).toBe("Öncü Üye");
  expect(
    (
      await as(
        admin,
        "select * from member_trust_adjustments where user_id=$1",
        [f.author],
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (await as(f.author, "select * from member_trust_adjustments")).rows,
  ).toHaveLength(0);
});
it("keeps community warnings pending, enforces source country, and counts only distinct real confirmations", async () => {
  const admin = await user(40, "admin"),
    author = await user(),
    reader = await user();
  const source = await post(author, "spain");
  await expect(
    as(
      reader,
      "insert into document_notes(country_id,document_key,document_title,title,body,source_type,post_id) values('spain','spain-tourism-5','Sigorta','A critical warning','A sufficiently detailed real experience warning.','experience',$1)",
      [source],
    ),
  ).rejects.toThrow();
  await expect(
    as(
      admin,
      "insert into document_notes(country_id,document_key,document_title,title,body,source_type,post_id) values('estonia','insurance','Sigorta','A critical warning','A sufficiently detailed real experience warning.','experience',$1)",
      [source],
    ),
  ).rejects.toThrow();
  const r = await as(
    admin,
    "insert into document_notes(country_id,document_key,document_title,title,body,source_type,post_id) values('spain','spain-tourism-5','Sigorta','A critical warning','A sufficiently detailed real experience warning.','experience',$1) returning id",
    [source],
  );
  const id = (r.rows[0] as { id: string }).id;
  expect(
    (await as(null, "select * from document_note_feed where id=$1", [id])).rows,
  ).toHaveLength(0);
  await as(admin, "select moderate_document_note($1,'approved')", [id]);
  expect(
    (
      await as(
        null,
        "select similar_count from document_note_feed where id=$1",
        [id],
      )
    ).rows[0],
  ).toMatchObject({ similar_count: 0 });
  await as(
    reader,
    "insert into document_note_confirmations(user_id,note_id) values($1,$2)",
    [reader, id],
  );
  await expect(
    as(
      reader,
      "insert into document_note_confirmations(user_id,note_id) values($1,$2)",
      [reader, id],
    ),
  ).rejects.toThrow();
  await expect(
    as(
      author,
      "insert into document_note_confirmations(user_id,note_id) values($1,$2)",
      [author, id],
    ),
  ).rejects.toThrow();
  expect(
    (
      await as(
        null,
        "select similar_count from document_note_feed where id=$1",
        [id],
      )
    ).rows[0],
  ).toMatchObject({ similar_count: 1 });
  await as(admin, "select moderate($1,'rejected')", [source]);
  expect(
    (await as(null, "select * from document_note_feed where id=$1", [id])).rows,
  ).toHaveLength(0);
});
it("keeps the founding cohort capped after deletion and never reuses a member number", async () => {
  await root("select setval('public.member_number_seq',999,true)");
  const thousand = await user(),
    later = await user();
  expect(await metrics(thousand)).toMatchObject({
    member_number: 1000,
    is_pioneer: true,
  });
  expect(await metrics(later)).toMatchObject({
    member_number: 1001,
    is_pioneer: false,
    membership_level: "Yeni Üye",
  });
  await root("delete from auth.users where id=$1", [thousand]);
  const newest = await user();
  expect(await metrics(newest)).toMatchObject({
    member_number: 1002,
    is_pioneer: false,
  });
});
it("makes Büyükelçi attainable only with sustained diversity and 200 independent supporters", async () => {
  const author = await user(400),
    source = await post(await user(400));
  const voters = Array.from({ length: 200 }, () => ({
    id: randomUUID(),
    name: `fixture_${++serial}`,
  }));
  await root("set session_replication_role=replica");
  try {
    await root(
      "insert into auth.users select id,jsonb_build_object('username',name) from jsonb_to_recordset($1::jsonb) as v(id uuid,name text)",
      [JSON.stringify(voters)],
    );
    await root(
      "insert into profiles(id,username,display_name,created_at) select id,name,'Established supporter',now()-interval '400 days' from jsonb_to_recordset($1::jsonb) as v(id uuid,name text)",
      [JSON.stringify(voters)],
    );
    await root(
      "insert into posts(user_id,country_id,kind,title,body,status,created_at) select id,'estonia','question','Historical question','A historical approved contribution fixture.','approved',now()-interval '2 days' from jsonb_to_recordset($1::jsonb) as v(id uuid)",
      [JSON.stringify(voters)],
    );
    await root(
      "insert into posts(user_id,country_id,kind,title,body,status,city,result,first_schengen,employment_status,financing,created_at) select $1,(array['estonia','germany','france','italy','spain','greece','netherlands','poland'])[1+(n%8)],'experience','Historical experience','A historical approved experience fixture.','approved','İstanbul','approved',true,'Çalışan','Kendim',now()-interval '2 days' from generate_series(1,120)n",
      [author],
    );
    await root(
      "insert into comments(user_id,post_id,body,status) select $1,$2,'An approved useful contribution.','approved' from generate_series(1,400)",
      [author, source],
    );
    const comments = (
      await root(
        "select id from comments where user_id=$1 order by id limit 100",
        [author],
      )
    ).rows as { id: string }[];
    const votes = voters.flatMap((v, i) =>
      Array.from({ length: 10 }, (_, j) => ({
        user_id: v.id,
        comment_id: comments[(i * 10 + j) % 100].id,
      })),
    );
    await root(
      "insert into comment_helpful_votes select user_id,comment_id from jsonb_to_recordset($1::jsonb) as v(user_id uuid,comment_id uuid)",
      [JSON.stringify(votes)],
    );
  } finally {
    await root("set session_replication_role=origin");
  }
  await root("select refresh_member_progress($1)", [author]);
  expect(await metrics(author)).toMatchObject({
    membership_level: "Büyükelçi",
    badge_score: 8280,
  });
  expect(await awardIds(author)).toContain("buyukelci");
  await root("delete from comment_helpful_votes where user_id=$1", [
    voters[0].id,
  ]);
  const downgraded = await metrics(author);
  expect(downgraded.badge_score).toBeGreaterThan(8000);
  expect(downgraded.membership_level).toBe("Elçi");
  expect(await awardIds(author)).not.toContain("buyukelci");
});

it("keeps administrator setup compatible with quality-based badge rules", async () => {
  await root("select 1");
  await pg.exec(readFileSync("docs/ADMIN_SETUP.sql", "utf8"));
  const author = await user(400),
    admin = await user(400, "admin");
  await as(
    admin,
    "select admin_adjust_reputation($1,99999,'Compatibility fixture bonus','admin-setup-quality-test')",
    [author],
  );
  const pending = await as(
    author,
    "insert into posts(user_id,country_id,kind,title,body) values($1,'spain','question','A genuine fixture question','An actual pending question fixture for moderation.') returning id",
    [author],
  );
  await as(admin, "select moderate($1,'approved')", [
    (pending.rows[0] as { id: string }).id,
  ]);
  expect((await metrics(author)).membership_level).toBe("Yeni Üye");
  expect(await awardIds(author)).not.toContain("buyukelci");
});

it("lets a normal member submit categorized critical information and only exposes it publicly after approval", async () => {
  const author = await user(30),
    admin = await user(40, "admin");
  const inserted = await as(
    author,
    "insert into posts(user_id,country_id,kind,category_id,title,body) values($1,'spain','tip','invitation','Davet mektubunu erkenden hazırlayın','Ev sahibimin davet mektubunu hazırlaması zaman aldı; erkenden iletişime geçin.') returning id,status",
    [author],
  );
  const pending = inserted.rows[0] as { id: string; status: string };
  expect(pending.status).toBe("pending");
  const read = () =>
    as(
      null,
      "select id from posts where country_id='spain' and kind='tip' and status='approved' and not is_sample and category_id in ('invitation') and id=$1",
      [pending.id],
    );
  expect((await read()).rows).toHaveLength(0);
  await expect(
    as(author, "select moderate($1,'approved')", [pending.id]),
  ).rejects.toThrow();
  await as(admin, "select moderate($1,'approved')", [pending.id]);
  expect((await read()).rows).toHaveLength(1);
  expect(
    (
      await as(
        null,
        "select id from posts where country_id='estonia' and kind='tip' and status='approved' and category_id='invitation' and id=$1",
        [pending.id],
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        null,
        "select id from posts where country_id='spain' and kind='tip' and status='approved' and category_id='appointment' and id=$1",
        [pending.id],
      )
    ).rows,
  ).toHaveLength(0);
  await as(admin, "select moderate($1,'rejected')", [pending.id]);
  expect((await read()).rows).toHaveLength(0);
});

it("publishes ordinary comments and replies immediately, with notifications and server-only rewards", async () => {
  const author = await user(),
    reader = await user(),
    admin = await user(40, "admin");
  const source = await post(author, "norway", "question");
  const r = await as(
    reader,
    "insert into comments(user_id,post_id,body) values($1,$2,'An ordinary comment without a moderation queue.') returning id,status,approved_by,approved_at",
    [reader, source],
  );
  const c = r.rows[0] as { id: string; status: string; approved_at: string };
  expect(c.status).toBe("approved");
  expect(c.approved_at).toBeTruthy();
  expect(
    (await as(null, "select id from comments where id=$1", [c.id])).rows,
  ).toHaveLength(1);
  expect(
    (
      await as(
        author,
        "select message from notifications where post_id=$1 and message like '%yanıt%'",
        [source],
      )
    ).rows,
  ).toHaveLength(1);
  const reward = await root(
    "select * from reputation_events where reference=$1",
    ["comment_approval:" + c.id],
  );
  expect(reward.rows).toHaveLength(1);
  await expect(
    as(reader, "select reward_published_comment($1)", [c.id]),
  ).rejects.toThrow();
  const reply = await as(
    author,
    "insert into comments(user_id,post_id,parent_comment_id,body) values($1,$2,$3,'An immediate useful reply.') returning status",
    [author, source, c.id],
  );
  expect(reply.rows[0]).toMatchObject({ status: "approved" });
  const pending = await as(
    reader,
    "insert into posts(user_id,country_id,kind,title,body) values($1,'norway','question','A pending question','This question must still wait for approval.') returning id,status",
    [reader],
  );
  expect(pending.rows[0]).toMatchObject({ status: "pending" });
  await expect(
    as(
      reader,
      "insert into comments(user_id,post_id,body) values($1,$2,'Must not bypass parent visibility')",
      [reader, (pending.rows[0] as { id: string }).id],
    ),
  ).rejects.toThrow();
  await as(admin, "select moderate($1,'rejected',true,'Confirmed abuse')", [
    c.id,
  ]);
  expect(
    (await as(null, "select id from comments where id=$1", [c.id])).rows,
  ).toHaveLength(0);
});

it("applies the repeatable comments/country upgrade without restoring removed comments or overwriting country documents", async () => {
  const author = await user(),
    source = await post(author, "norway", "question");
  await root("set session_replication_role=replica");
  let pending: string, rejected: string;
  try {
    const r = await root(
      "insert into comments(user_id,post_id,body,status) values($1,$2,'An older waiting comment','pending'),($1,$2,'An older removed comment','rejected') returning id,status",
      [author, source],
    );
    pending = (
      r.rows.find((x) => (x as { status: string }).status === "pending") as {
        id: string;
      }
    ).id;
    rejected = (
      r.rows.find((x) => (x as { status: string }).status === "rejected") as {
        id: string;
      }
    ).id;
  } finally {
    await root("set session_replication_role=origin");
  }
  await root(
    "update country_documents set body='A deliberate administrator edit that must be retained.' where country_id='norway' and sort_order=1",
  );
  await root("select 1");
  await pg.exec(
    readFileSync("docs/COUNTRIES_AND_COMMENTS_UPGRADE.sql", "utf8"),
  );
  expect(
    (await root("select status from comments where id=$1", [pending!])).rows[0],
  ).toMatchObject({ status: "approved" });
  expect(
    (await root("select status from comments where id=$1", [rejected!]))
      .rows[0],
  ).toMatchObject({ status: "rejected" });
  expect(
    (
      await root(
        "select body from country_documents where country_id='norway' and sort_order=1",
      )
    ).rows[0],
  ).toMatchObject({
    body: "A deliberate administrator edit that must be retained.",
  });
  expect(
    (await as(null, "select code,is_schengen from countries where id='norway'"))
      .rows[0],
  ).toMatchObject({ code: "NO", is_schengen: true });
  expect(
    (
      await as(
        null,
        "select id from country_documents where country_id='norway'",
      )
    ).rows,
  ).toHaveLength(13);
});

it("stores optional experience history and invitation notes in RLS-protected feeds without requiring a narrative", async () => {
  const author = await user(),
    admin = await user(40, "admin");
  const history = [
    {
      country: "Fransa",
      issue_date: "2024-07-01",
      duration: "6 ay",
      entries: "multi",
      notes: "Önceki vize notu",
    },
  ];
  const r = await as(
    author,
    "insert into posts(user_id,country_id,kind,title,body,city,center,result,first_schengen,employment_status,financing,previous_visas,invitation_notes) values($1,'germany','experience','Kültürel etkinlik deneyimi','','İstanbul','iData','approved',false,'Öğrenci','Sponsor',$2,'Davetiyem etkinlik düzenleyicisindendi.') returning id",
    [author, JSON.stringify(history)],
  );
  const id = (r.rows[0] as { id: string }).id;
  expect(
    (await as(null, "select id from feed where id=$1", [id])).rows,
  ).toHaveLength(0);
  await as(admin, "select moderate($1,'approved')", [id]);
  expect(
    (
      await as(
        null,
        "select body,previous_visas,invitation_notes from feed where id=$1",
        [id],
      )
    ).rows[0],
  ).toMatchObject({
    body: "",
    previous_visas: history,
    invitation_notes: "Davetiyem etkinlik düzenleyicisindendi.",
  });
  await expect(
    as(author, "update posts set previous_visas=$2 where id=$1", [id, "[]"]),
  ).rejects.toThrow();
  for (const invalid of [
    [{ ...history[0], issue_date: "2024-02-30" }],
    [{ ...history[0], unknown: "private-extra" }],
    Array(11).fill(history[0]),
  ])
    await expect(
      root("update posts set previous_visas=$2 where id=$1", [
        id,
        JSON.stringify(invalid),
      ]),
    ).rejects.toThrow();
  await expect(
    root("update posts set first_schengen=true where id=$1", [id]),
  ).rejects.toThrow();
  await expect(
    as(
      author,
      "insert into posts(user_id,country_id,kind,title,body) values($1,'germany','question','An invalid empty question','')",
      [author],
    ),
  ).rejects.toThrow();
  await root("select 1");
  await pg.exec(readFileSync("docs/FORMS_UPGRADE.sql", "utf8"));
  expect(
    (await as(null, "select previous_visas from feed where id=$1", [id]))
      .rows[0],
  ).toMatchObject({ previous_visas: history });
  expect(
    (await as(null, "select id from forum_categories where id='doc-insurance'"))
      .rows,
  ).toHaveLength(1);
});

it("keeps supporting files private and separates publication from staff evidence verification", async () => {
  const author = await user(30),
    other = await user(30),
    staff = await user(50, "moderator");
  const id = await post(author, "germany", "tip", "doc-insurance");
  const path = `${author}/${id}/${randomUUID()}.pdf`;
  await as(
    author,
    "insert into storage.objects(id,bucket_id,name,metadata) values($1,'post-evidence',$2,$3)",
    [
      randomUUID(),
      path,
      JSON.stringify({ size: 1000, mimetype: "application/pdf" }),
    ],
  );
  expect(
    (await as(other, "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  await as(
    author,
    "select register_post_evidence($1,$2,'redacted-policy.pdf')",
    [id, path],
  );
  const read = () => "select * from post_evidence where post_id=$1";
  expect((await as(other, read(), [id])).rows).toHaveLength(0);
  expect((await as(author, read(), [id])).rows).toHaveLength(1);
  expect((await as(staff, read(), [id])).rows).toHaveLength(1);
  await expect(as(null, read(), [id])).rejects.toThrow();
  expect(
    (await as(other, "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  expect(
    (await as(staff, "select * from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  await expect(
    as(other, "select register_post_evidence($1,$2,'stolen.pdf')", [id, path]),
  ).rejects.toThrow();
  await expect(
    as(
      author,
      "insert into post_verifications(post_id,status) values($1,'verified')",
      [id],
    ),
  ).rejects.toThrow();
  await expect(
    as(author, "select review_post_evidence($1,'verified')", [id]),
  ).rejects.toThrow();
  const initial = (await metrics(author)).badge_score;
  await as(
    staff,
    "select review_post_evidence($1,'verified','Dates and the relevant policy section checked')",
    [id],
  );
  expect((await metrics(author)).badge_score).toBe(initial + 10);
  expect(
    (
      await as(null, "select status from post_verifications where post_id=$1", [
        id,
      ])
    ).rows[0],
  ).toMatchObject({ status: "verified" });
  expect(
    (await as(null, "select source_type from posts where id=$1", [id])).rows[0],
  ).toMatchObject({ source_type: "submission" });
  await as(staff, "select review_post_evidence($1,'verified')", [id]);
  expect((await metrics(author)).badge_score).toBe(initial + 10);
  await expect(
    as(author, "update storage.objects set name='changed' where name=$1", [
      path,
    ]),
  ).rejects.toThrow();
  expect(
    (
      await as(
        author,
        "delete from storage.objects where name=$1 returning id",
        [path],
      )
    ).rows,
  ).toHaveLength(0);
  const eid = ((await as(author, read(), [id])).rows[0] as { id: string }).id;
  await expect(
    as(author, "select remove_post_evidence($1)", [eid]),
  ).rejects.toThrow();
  await as(
    staff,
    "select review_post_evidence($1,'declined','Evidence does not support the actual claim')",
    [id],
  );
  expect((await metrics(author)).badge_score).toBe(initial);
  expect(
    (await as(null, "select status from posts where id=$1", [id])).rows[0],
  ).toMatchObject({ status: "approved" });
  await as(staff, "select review_post_evidence($1,'verified')", [id]);
  expect((await metrics(author)).badge_score).toBe(initial + 10);
  await as(staff, "select moderate($1,'rejected')", [id]);
  expect((await metrics(author)).badge_score).toBe(0);
  expect(
    (await as(null, "select * from post_verifications where post_id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  await expect(
    as(staff, "select review_post_evidence($1,'verified')", [id]),
  ).rejects.toThrow();
  await as(author, "select remove_post_evidence($1)", [eid]);
  expect(
    (
      await as(
        author,
        "delete from storage.objects where name=$1 returning id",
        [path],
      )
    ).rows,
  ).toHaveLength(1);
});

it("enforces evidence count, actual storage metadata and independent review, and audits topic corrections", async () => {
  const author = await user(30, "admin"),
    staff = await user(30, "moderator"),
    stranger = await user(30);
  const id = await post(author, "germany", "tip", "finance");
  await expect(
    as(author, "select register_post_evidence($1,$2,'fake.pdf')", [
      id,
      `${author}/${id}/missing.pdf`,
    ]),
  ).rejects.toThrow();
  for (let n = 0; n < 5; n++) {
    const path = `${author}/${id}/${n}.pdf`;
    await as(
      author,
      "insert into storage.objects(id,bucket_id,name,metadata) values($1,'post-evidence',$2,$3)",
      [
        randomUUID(),
        path,
        JSON.stringify({ size: 100, mimetype: "application/pdf" }),
      ],
    );
    await as(author, "select register_post_evidence($1,$2,'redacted.pdf')", [
      id,
      path,
    ]);
  }
  await expect(
    as(
      author,
      "insert into storage.objects(id,bucket_id,name,metadata) values($1,'post-evidence',$2,$3)",
      [
        randomUUID(),
        `${author}/${id}/sixth.pdf`,
        JSON.stringify({ size: 100, mimetype: "application/pdf" }),
      ],
    ),
  ).rejects.toThrow();
  await expect(
    as(author, "select review_post_evidence($1,'verified')", [id]),
  ).rejects.toThrow();
  await expect(
    as(stranger, "select relocate_critical_tip($1,'doc-insurance')", [id]),
  ).rejects.toThrow();
  await as(staff, "select relocate_critical_tip($1,'doc-insurance')", [id]);
  expect(
    (await as(null, "select category_id from posts where id=$1", [id])).rows[0],
  ).toMatchObject({ category_id: "doc-insurance" });
  expect(
    (
      await as(
        staff,
        "select * from moderation_actions where post_id=$1 and note like 'Konu bağlantısı:%'",
        [id],
      )
    ).rows,
  ).toHaveLength(1);
  await root("select 1");
  await pg.exec(readFileSync("docs/EVIDENCE_UPGRADE.sql", "utf8"));
  expect(
    (await root("select public from storage.buckets where id='post-evidence'"))
      .rows[0],
  ).toMatchObject({ public: false });
  expect(
    (await as(author, "select * from post_evidence where post_id=$1", [id]))
      .rows,
  ).toHaveLength(5);
});

it("rejects unsupported stored evidence and corrects only the explicitly reported insurance notes", async () => {
  const author = await user(30);
  const id = await post(author, "germany", "tip", "doc-insurance");
  for (const metadata of [
    { size: 8388609, mimetype: "application/pdf" },
    { size: 50, mimetype: "text/html" },
    { mimetype: "application/pdf" },
  ]) {
    const path = `${author}/${id}/${randomUUID()}.pdf`;
    await root(
      "insert into storage.objects(id,bucket_id,name,metadata) values($1,'post-evidence',$2,$3)",
      [randomUUID(), path, JSON.stringify(metadata)],
    );
    await expect(
      as(author, "select register_post_evidence($1,$2,'bad.pdf')", [id, path]),
    ).rejects.toThrow();
  }
  const reported = "a5997c85-bcbe-48a6-9642-b60e4a5bfec1";
  await root(
    "insert into posts(id,user_id,country_id,kind,category_id,title,body,status) values($1,$2,'germany','tip','sponsor','sağlık sigortası','sağlık sigortası ıslak imza istiyor','approved')",
    [reported, author],
  );
  await root("select 1");
  await pg.exec(readFileSync("docs/EVIDENCE_UPGRADE.sql", "utf8"));
  expect(
    (await root("select category_id from posts where id=$1", [reported]))
      .rows[0],
  ).toMatchObject({ category_id: "doc-insurance" });
  await root("update posts set category_id='other' where id=$1", [reported]);
  await pg.exec(readFileSync("docs/EVIDENCE_UPGRADE.sql", "utf8"));
  expect(
    (await root("select category_id from posts where id=$1", [reported]))
      .rows[0],
  ).toMatchObject({ category_id: "other" });
});

it("withdraws verification and its bonus when verified content changes or is deleted", async () => {
  const author = await user(30),
    staff = await user(30, "moderator");
  const id = await post(author, "germany", "tip", "doc-insurance");
  const path = `${author}/${id}/policy.pdf`;
  await as(
    author,
    "insert into storage.objects(id,bucket_id,name,metadata) values($1,'post-evidence',$2,$3)",
    [
      randomUUID(),
      path,
      JSON.stringify({ size: 100, mimetype: "application/pdf" }),
    ],
  );
  await as(author, "select register_post_evidence($1,$2,'policy.pdf')", [
    id,
    path,
  ]);
  await as(
    staff,
    "select review_post_evidence($1,'verified','private audit note')",
    [id],
  );
  expect((await metrics(author)).badge_score).toBe(10);
  expect(
    (
      await as(author, "select * from moderation_actions where post_id=$1", [
        id,
      ])
    ).rows,
  ).toHaveLength(0);
  await root(
    "update posts set body='Edited claim requiring another review.' where id=$1",
    [id],
  );
  expect((await metrics(author)).badge_score).toBe(0);
  expect(
    (
      await as(null, "select status from post_verifications where post_id=$1", [
        id,
      ])
    ).rows[0],
  ).toMatchObject({ status: "pending" });
  await as(staff, "select review_post_evidence($1,'verified')", [id]);
  expect((await metrics(author)).badge_score).toBe(10);
  await root("delete from posts where id=$1", [id]);
  expect((await metrics(author)).badge_score).toBe(0);
  expect(
    (
      await root("select * from reputation_events where reference=$1", [
        `admin:evidence:${id}`,
      ])
    ).rows,
  ).toHaveLength(0);
});
it("provisions Denmark additively and preserves existing checklist edits on rerun", async () => {
  expect(
    (
      await as(
        null,
        "select code,is_schengen from countries where id='denmark'",
      )
    ).rows[0],
  ).toMatchObject({ code: "DK", is_schengen: true });
  expect(
    (
      await as(
        null,
        "select id from country_documents where country_id='denmark'",
      )
    ).rows,
  ).toHaveLength(13);
  await root(
    "update country_documents set body='An existing administrator checklist edit.' where country_id='denmark' and sort_order=1",
  );
  await pg.exec(readFileSync("docs/DENMARK_UPGRADE.sql", "utf8"));
  expect(
    (
      await as(
        null,
        "select body from country_documents where country_id='denmark' and sort_order=1",
      )
    ).rows[0],
  ).toMatchObject({ body: "An existing administrator checklist edit." });
});
it("only the author can remove a post or comment and dependent rows disappear", async () => {
  const author = await user(),
    other = await user(),
    admin = await user(20, "admin"),
    pid = await post(author);
  const c = await root(
    "insert into comments(post_id,user_id,body,status) values($1,$2,'A comment to delete','approved') returning id",
    [pid, other],
  );
  const cid = (c.rows[0] as { id: string }).id;
  await expect(
    as(null, "select delete_own_content($1)", [pid]),
  ).rejects.toThrow();
  await expect(
    as(other, "select delete_own_content($1)", [pid]),
  ).rejects.toThrow();
  await expect(
    as(admin, "select delete_own_content($1)", [pid]),
  ).rejects.toThrow();
  await expect(
    as(author, "select delete_own_content($1,true)", [cid]),
  ).rejects.toThrow();
  await as(other, "select delete_own_content($1,true)", [cid]);
  expect(
    (await root("select id from comments where id=$1", [cid])).rows,
  ).toHaveLength(0);
  await root(
    "insert into comments(post_id,user_id,body,status) values($1,$2,'Another dependent comment','approved')",
    [pid, other],
  );
  await as(author, "select delete_own_content($1)", [pid]);
  expect(
    (await root("select id from posts where id=$1", [pid])).rows,
  ).toHaveLength(0);
  expect(
    (await root("select id from comments where post_id=$1", [pid])).rows,
  ).toHaveLength(0);
});
it("country editing is administrator-only, validates URLs and generates a real flag", async () => {
  const normal = await user(),
    admin = await user(20, "admin");
  const payload = {
    id: "belgium",
    name: "Belçika",
    code: "BE",
    summary: "A manually maintained guide",
    cover_url: "https://example.com/photo.jpg",
    source_url: "https://example.com/official",
    appointment_url: "https://example.com/book",
    is_schengen: true,
  };
  await expect(
    as(normal, "select admin_save_country($1::jsonb)", [
      JSON.stringify(payload),
    ]),
  ).rejects.toThrow();
  await expect(
    as(admin, "select admin_save_country($1::jsonb)", [
      JSON.stringify({ ...payload, cover_url: "http://invalid.test/photo" }),
    ]),
  ).rejects.toThrow();
  await as(admin, "select admin_save_country($1::jsonb)", [
    JSON.stringify(payload),
  ]);
  expect(
    (
      await as(
        null,
        "select name,code,flag,summary from countries where id='belgium'",
      )
    ).rows[0],
  ).toMatchObject({
    name: "Belçika",
    code: "BE",
    flag: "🇧🇪",
    summary: payload.summary,
  });
  await expect(
    as(admin, "select admin_save_country($1::jsonb)", [
      JSON.stringify({ ...payload, id: "duplicate-belgium" }),
    ]),
  ).rejects.toThrow();
  await as(admin, "select admin_save_country($1::jsonb)", [
    JSON.stringify({ ...payload, summary: "Updated guide" }),
  ]);
  expect(
    (await as(null, "select summary from countries where id='belgium'"))
      .rows[0],
  ).toMatchObject({ summary: "Updated guide" });
  await pg.exec("reset role");
  await pg.exec(readFileSync("docs/MOBILE_CONTROLS_UPGRADE.sql", "utf8"));
  expect(
    (await as(null, "select flag from countries where id='belgium'")).rows[0],
  ).toMatchObject({ flag: "🇧🇪" });
});

it("enforces private profile approval in feed, comments and direct post reads", async () => {
  const owner = await user(),
    follower = await user(),
    outsider = await user();
  const pid = await post(owner);
  await as(owner, "update profiles set is_private=true where id=$1", [owner]);
  expect(
    (await as(null, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(0);
  expect(
    (await as(outsider, "select id from posts where id=$1", [pid])).rows,
  ).toHaveLength(0);
  await as(follower, "select social_follow($1)", [owner]);
  expect(
    (await as(follower, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(0);
  await expect(
    as(outsider, "update user_follows set status='accepted'"),
  ).rejects.toThrow();
  await as(owner, "select social_follow($1,'accept')", [follower]);
  expect(
    (await as(follower, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(1);
  await as(owner, "select chat_block_user($1,true)", [follower]);
  expect(
    (await as(follower, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(0);
  await as(owner, "select chat_block_user($1,false)", [follower]);
  await as(follower, "select social_follow($1,'unfollow')", [owner]);
  expect(
    (await as(follower, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(0);
  expect(
    (await as(owner, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(1);
});
it("turns pending requests into followers only when the owner opens the profile", async () => {
  const owner = await user(),
    follower = await user(),
    third = await user();
  await as(owner, "update profiles set is_private=true where id=$1", [owner]);
  await as(follower, "select social_follow($1)", [owner]);
  await as(third, "select social_follow($1,'accept')", [follower]);
  expect(
    (
      await root("select status from user_follows where following_id=$1", [
        owner,
      ])
    ).rows[0],
  ).toMatchObject({ status: "pending" });
  await as(owner, "update profiles set is_private=false where id=$1", [owner]);
  expect(
    (
      await root("select status from user_follows where following_id=$1", [
        owner,
      ])
    ).rows[0],
  ).toMatchObject({ status: "accepted" });
  await expect(
    as(follower, "select social_follow($1)", [follower]),
  ).rejects.toThrow();
});
it("keeps photos private to accepted direct-chat participants and scopes reports to a single image", async () => {
  const a = await user(),
    b = await user(),
    outsider = await user(),
    staff = await user(50, "moderator");
  const r = await as(a, "select chat_create_private(array[$1]::uuid[],'') id", [
    b,
  ]);
  const room = (r.rows[0] as { id: string }).id;
  const mid = randomUUID(),
    path = `${room}/${a}/${mid}.jpg`;
  await expect(
    as(
      a,
      "insert into storage.objects(id,bucket_id,name,metadata) values($1,'chat-media',$2,$3)",
      [
        randomUUID(),
        path,
        JSON.stringify({ size: 1000, mimetype: "image/jpeg" }),
      ],
    ),
  ).rejects.toThrow();
  await as(b, "select chat_answer_invite($1,true)", [room]);
  const draftPath = `${room}/${a}/${randomUUID()}.png`;
  await as(
    a,
    "insert into storage.objects(id,bucket_id,name,metadata) values($1,'chat-media',$2,$3)",
    [
      randomUUID(),
      draftPath,
      JSON.stringify({ size: 200, mimetype: "image/png" }),
    ],
  );
  expect(
    (
      await as(a, "delete from storage.objects where name=$1 returning name", [
        draftPath,
      ])
    ).rows,
  ).toHaveLength(1);
  await as(
    a,
    "insert into storage.objects(id,bucket_id,name,metadata) values($1,'chat-media',$2,$3)",
    [
      randomUUID(),
      path,
      JSON.stringify({ size: 1000, mimetype: "image/jpeg" }),
    ],
  );
  await expect(
    as(outsider, "select chat_send_attachment($1,$2,null,$3)", [
      room,
      mid,
      path,
    ]),
  ).rejects.toThrow();
  await as(a, "select chat_send_attachment($1,$2,null,$3)", [room, mid, path]);
  await as(a, "select chat_send_attachment($1,$2,null,$3)", [room, mid, path]);
  expect(
    (await as(b, "select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await as(outsider, "select name from storage.objects where name=$1", [
        path,
      ])
    ).rows,
  ).toHaveLength(0);
  expect(
    (await as(staff, "select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  await as(b, "select chat_report_message($1,'Unwanted photo')", [mid]);
  expect(
    (await as(staff, "select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  await as(a, "select chat_hide_message($1)", [mid]);
  expect(
    (await as(b, "select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(0);
  expect(
    (await as(staff, "select name from storage.objects where name=$1", [path]))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await as(a, "delete from storage.objects where name=$1 returning name", [
        path,
      ])
    ).rows,
  ).toHaveLength(0);
});
it("does not copy private posts to unauthorized recipients and hides stale popular content", async () => {
  const a = await user(),
    b = await user();
  const pid = await post(a);
  const room = (
    (await as(a, "select chat_create_private(array[$1]::uuid[],'') id", [b]))
      .rows[0] as { id: string }
  ).id;
  await as(b, "select chat_answer_invite($1,true)", [room]);
  await as(a, "update profiles set is_private=true where id=$1", [a]);
  await expect(
    as(a, "select chat_send_attachment($1,$2,$3)", [room, randomUUID(), pid]),
  ).rejects.toThrow();
  await as(b, "select social_follow($1)", [a]);
  await as(a, "select social_follow($1,'accept')", [b]);
  await as(a, "select chat_send_attachment($1,$2,$3)", [
    room,
    randomUUID(),
    pid,
  ]);
  await as(b, "select social_follow($1,'unfollow')", [a]);
  expect(
    (await as(b, "select id from feed where id=$1", [pid])).rows,
  ).toHaveLength(0);
  await as(a, "update profiles set is_private=false where id=$1", [a]);
  const old = await post(a);
  await root(
    "update posts set created_at=now()-interval '31 days' where id=$1",
    [old],
  );
  const discover = (await as(null, "select id from discover_posts(30,0)"))
    .rows as { id: string }[];
  expect(discover.some((x) => x.id === pid)).toBe(true);
  expect(discover.some((x) => x.id === old)).toBe(false);
});
it("ranks recent helpful content globally before pagination and replays the upgrade safely", async () => {
  const a = await user(),
    b = await user(),
    c = await user();
  const hot = await post(a),
    aging = await post(a),
    fresh = await post(a);
  await root(
    "update posts set created_at=now()-interval '20 days' where id=$1",
    [aging],
  );
  for (const voter of [b, c])
    for (const pid of [hot, aging])
      await as(
        voter,
        "insert into helpful_votes(user_id,post_id) values($1,$2)",
        [voter, pid],
      );
  const ranked = (
    await as(null, "select id from discover_posts(30,0)")
  ).rows.map((r) => (r as { id: string }).id);
  expect(ranked.indexOf(hot)).toBeGreaterThanOrEqual(0);
  expect(ranked.indexOf(hot)).toBeLessThan(ranked.indexOf(aging));
  expect(ranked.indexOf(fresh)).toBeGreaterThan(ranked.indexOf(hot));
  await pg.exec("reset role");
  await pg.exec(readFileSync("docs/SOCIAL_MOBILE_UPGRADE.sql", "utf8"));
  expect(
    (await as(a, "select id from posts where id=$1", [hot])).rows,
  ).toHaveLength(1);
  await expect(
    as(a, "select chat_pair_blocked($1,$2)", [b, c]),
  ).rejects.toThrow();
});
