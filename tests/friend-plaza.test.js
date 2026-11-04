import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
const ids = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
  "00000000-0000-0000-0000-000000000003",
];
const asUser = async (id) =>
  db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
const call = async (name, args = [], types = []) =>
  (
    await db.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}::${types[i]}`).join(",")}) result`,
      args,
    )
  ).rows[0].result;
const save = async (notes) => {
  const row = (await db.query("select revision from public.account_records"))
    .rows[0];
  return call(
    "save_account_records",
    [{ notes, planner: { tasks: [], events: [] } }, row?.revision || 0],
    ["jsonb", "integer"],
  );
};
const note = (id, extra = {}) => ({
  id,
  title: "友達へ",
  body: "公開本文",
  date: "2026-11-04",
  time: "15:00",
  mood: 4,
  feeling: "いいかも",
  image: "data:image/png;base64,AAAA",
  shareToFriends: true,
  history: [{ body: "過去の秘密" }],
  reflections: [{ text: "自分への秘密" }],
  comments: [{ text: "ローカルの秘密" }],
  ...extra,
});
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;insert into auth.users values ${ids.map((id) => `('${id}')`).join(",")};`,
  );
  for (const file of [
    "202610290001_accounts_and_friends.sql",
    "202611040001_friend_plaza.sql",
  ])
    await db.exec(
      readFileSync(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
});
after(async () => db?.close());
test("only explicit sharing publishes whitelisted content; accepted friends only, never private history", async () => {
  await asUser(ids[0]);
  const a = await call("friend_home");
  await save([
    note(123),
    note(124, { shareToFriends: false }),
    note(125, { shareToFriends: undefined, visibility: "public" }),
  ]);
  const owner = await call("friend_plaza", [0], ["integer"]);
  assert.equal(owner.items.length, 1);
  assert.deepEqual(
    Object.keys(owner.items[0].content).sort(),
    ["title", "body", "date", "time", "mood", "feeling", "image"].sort(),
  );
  assert.doesNotMatch(
    JSON.stringify(owner),
    /過去の秘密|自分への秘密|ローカルの秘密/,
  );
  await asUser(ids[1]);
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 0);
  await call("request_friend", [a.profile.invite_token], ["uuid"]);
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 0);
  await asUser(ids[0]);
  const connection = (await call("friend_home")).connections[0];
  await call("respond_friend", [connection.id, true], ["uuid", "boolean"]);
  await asUser(ids[1]);
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 1);
  assert.equal(
    (await db.query("select * from public.account_records")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.friend_notes")).rows.length,
    1,
  );
  await asUser(ids[2]);
  assert.equal(
    (await db.query("select * from public.friend_notes")).rows.length,
    0,
  );
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 0);
  await assert.rejects(
    () =>
      call(
        "set_friend_stamp",
        [ids[0], "123", "heart", true],
        ["uuid", "text", "text", "boolean"],
      ),
    /Note unavailable/,
  );
});
test("server-owned reactions and comments are idempotent; foreign writes and forged counts fail", async () => {
  await asUser(ids[1]);
  for (let i = 0; i < 3; i++)
    await call(
      "set_friend_stamp",
      [ids[0], "123", "heart", true],
      ["uuid", "text", "text", "boolean"],
    );
  let feed = await call("friend_plaza", [0], ["integer"]);
  assert.equal(feed.items[0].stamps.heart, 1);
  assert.equal(feed.items[0].myStamps.heart, true);
  await assert.rejects(
    () =>
      call(
        "set_friend_stamp",
        [ids[0], "123", "forged", true],
        ["uuid", "text", "text", "boolean"],
      ),
    /check constraint/,
  );
  const id = "11111111-1111-4111-8111-111111111111";
  for (let i = 0; i < 3; i++)
    await call(
      "add_friend_comment",
      [ids[0], "123", "おつかれさま", id],
      ["uuid", "text", "text", "uuid"],
    );
  await assert.rejects(
    () =>
      call(
        "add_friend_comment",
        [ids[0], "123", "書き換え", id],
        ["uuid", "text", "text", "uuid"],
      ),
    /Request conflict/,
  );
  feed = await call("friend_plaza", [0], ["integer"]);
  assert.equal(feed.items[0].commentCount, 1);
  assert.equal(feed.items[0].comments[0].text, "おつかれさま");
  await assert.rejects(
    () => db.query("update public.friend_notes set content='{}'::jsonb"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("delete from public.friend_stamps"),
    /permission denied/,
  );
  await asUser(ids[2]);
  await call("delete_friend_comment", [id], ["uuid"]);
  assert.equal(
    (await db.query("select * from public.friend_comments")).rows.length,
    0,
  );
  await asUser(ids[0]);
  assert.equal(
    (await call("friend_plaza", [0], ["integer"])).items[0].commentCount,
    1,
  );
  await call("delete_friend_comment", [id], ["uuid"]);
  assert.equal(
    (await call("friend_plaza", [0], ["integer"])).items[0].commentCount,
    0,
  );
});
test("editing a shared note does not re-publish histories; unfriend revokes access and unshare cascades feedback", async () => {
  await asUser(ids[0]);
  await save([note(123, { body: "更新本文" })]);
  assert.equal(
    (await call("friend_plaza", [0], ["integer"])).items[0].stamps.heart,
    1,
  );
  const c = (await call("friend_home")).connections[0];
  await call("respond_friend", [c.id, false], ["uuid", "boolean"]);
  await asUser(ids[1]);
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 0);
  assert.equal(
    (await db.query("select * from public.friend_stamps")).rows.length,
    0,
  );
  await assert.rejects(
    () =>
      call(
        "add_friend_comment",
        [ids[0], "123", "拒否", "22222222-2222-4222-8222-222222222222"],
        ["uuid", "text", "text", "uuid"],
      ),
    /Note unavailable/,
  );
  await asUser(ids[0]);
  await save([note(123, { shareToFriends: false })]);
  assert.equal(
    (await db.query("select * from public.friend_notes")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.friend_stamps")).rows.length,
    0,
  );
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 0);
});
test("pagination, private image filtering, anonymous denial and migration replay preserve data", async () => {
  await asUser(ids[0]);
  await save(
    Array.from({ length: 12 }, (_, i) =>
      note(i, { image: "https://untrusted.invalid/tracker.png" }),
    ),
  );
  let feed = await call("friend_plaza", [0], ["integer"]);
  assert.equal(feed.items.length, 10);
  assert.equal(feed.hasMore, true);
  assert.equal(feed.items[0].content.image, "");
  assert.equal((await call("friend_plaza", [1], ["integer"])).items.length, 2);
  await db.exec("reset role");
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/202611040001_friend_plaza.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await asUser(ids[0]);
  assert.equal((await call("friend_plaza", [0], ["integer"])).items.length, 10);
  await asUser("");
  await assert.rejects(
    () => call("friend_plaza", [0], ["integer"]),
    /Authentication required/,
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(() => call("friend_sharing_ready"), /permission denied/);
});
