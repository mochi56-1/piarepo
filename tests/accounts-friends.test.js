import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
const users = [
  "00000000-0000-0000-0000-000000000001",
  "00000000-0000-0000-0000-000000000002",
  "00000000-0000-0000-0000-000000000003",
];
const sql = readFileSync(
  new URL(
    "../supabase/migrations/202610290001_accounts_and_friends.sql",
    import.meta.url,
  ),
  "utf8",
);
const asUser = async (id) =>
  db.exec(
    `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
  );
const call = async (name, args = [], casts = []) =>
  (
    await db.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}${casts[i] ? "::" + casts[i] : ""}`).join(",")}) as result`,
      args,
    )
  ).rows[0].result;
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;insert into auth.users values ${users.map((id) => `('${id}')`).join(",")};`,
  );
  await db.exec(sql);
});
after(async () => db?.close());
test("private cloud records isolate users, reject direct writes and detect stale revisions", async () => {
  await asUser(users[0]);
  const doc = {
    notes: [
      {
        id: 1,
        body: "private diary",
        visibility: "public",
        image: "data:image/png;base64,AAAA",
      },
    ],
    planner: { tasks: [{ id: 2, title: "private task" }], events: [] },
  };
  assert.equal(
    await call("save_account_records", [doc, 0], ["jsonb", "integer"]),
    1,
  );
  await assert.rejects(
    () =>
      call(
        "save_account_records",
        [{ ...doc, notes: [] }, 0],
        ["jsonb", "integer"],
      ),
    /RECORD_CONFLICT/,
  );
  await asUser(users[1]);
  assert.equal(
    (await db.query("select * from public.account_records")).rows.length,
    0,
  );
  await assert.rejects(
    () => db.query("update public.account_records set revision=100"),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      call("save_account_records", [{ notes: [] }, 0], ["jsonb", "integer"]),
    /Invalid document/,
  );
  assert.equal(
    await call(
      "save_account_records",
      [{ notes: [], planner: { tasks: [], events: [] } }, 0],
      ["jsonb", "integer"],
    ),
    1,
  );
  await asUser(users[0]);
  assert.equal(
    (await db.query("select document from public.account_records")).rows[0]
      .document.notes[0].body,
    "private diary",
  );
  await asUser("");
  await assert.rejects(
    () => call("save_account_records", [doc, 1], ["jsonb", "integer"]),
    /Authentication required/,
  );
});
test("QR invitations require authentication and recipient consent; hide emails and tokens from strangers", async () => {
  await asUser(users[0]);
  let first = await call("friend_home");
  const token = first.profile.invite_token;
  await call("update_friend_profile", ["はな", false], ["text", "boolean"]);
  await assert.rejects(
    () => call("request_friend", [token], ["uuid"]),
    /Invalid invitation/,
  );
  await asUser(users[1]);
  assert.equal(await call("preview_friend_invite", [token], ["uuid"]), "はな");
  assert.equal(
    (await db.query("select * from public.friend_profiles")).rows.length,
    0,
  );
  await call("request_friend", [token], ["uuid"]);
  await call("request_friend", [token], ["uuid"]);
  let second = await call("friend_home");
  assert.equal(second.connections.length, 1);
  assert.equal(second.connections[0].incoming, false);
  assert.equal(second.connections[0].status, "pending");
  const id = second.connections[0].id;
  await call("respond_friend", [id, true], ["uuid", "boolean"]);
  assert.equal((await call("friend_home")).connections[0].status, "pending");
  await asUser(users[2]);
  assert.equal((await call("friend_home")).connections.length, 0);
  await call("respond_friend", [id, true], ["uuid", "boolean"]);
  assert.equal(
    (await db.query("select * from public.friend_connections")).rows.length,
    0,
  );
  await asUser(users[0]);
  assert.equal((await call("friend_home")).connections[0].incoming, true);
  await call("respond_friend", [id, true], ["uuid", "boolean"]);
  assert.equal((await call("friend_home")).connections[0].status, "accepted");
  await call("update_friend_profile", ["はな", true], ["text", "boolean"]);
  await asUser(users[1]);
  assert.equal(await call("preview_friend_invite", [token], ["uuid"]), null);
  await assert.rejects(
    () => call("request_friend", [token], ["uuid"]),
    /Invalid invitation/,
  );
  await call("respond_friend", [id, false], ["uuid", "boolean"]);
  assert.equal((await call("friend_home")).connections.length, 0);
  await asUser("");
  await assert.rejects(
    () => call("preview_friend_invite", [token], ["uuid"]),
    /Authentication required/,
  );
  await db.exec("reset role; set role anon");
  await assert.rejects(() => call("friend_home"), /permission denied/);
});
test("reapplying account migration preserves records and friend profiles", async () => {
  await db.exec("reset role");
  await db.exec(sql);
  await asUser(users[0]);
  assert.equal(
    (await db.query("select revision from public.account_records")).rows[0]
      .revision,
    1,
  );
  assert.equal((await call("friend_home")).profile.display_name, "はな");
});
