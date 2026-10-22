import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
const first = "00000000-0000-0000-0000-000000000001",
  second = "00000000-0000-0000-0000-000000000002";
const sql = readFileSync(
  new URL(
    "../supabase/migrations/202610220001_login_bonus.sql",
    import.meta.url,
  ),
  "utf8",
);
const asUser = async (id) =>
  db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
  );
const rpc = async (name) =>
  (await db.query(`select public.${name}() as result`)).rows[0].result;
before(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;insert into auth.users values ('${first}'),('${second}');`,
  );
  await db.exec(sql);
});
after(async () => {
  await db?.close();
});
test("server reward retries award ten coins exactly once and reject direct balance writes", async () => {
  await asUser(first);
  assert.equal((await rpc("get_login_bonus")).total, 0);
  let result = await rpc("claim_login_bonus");
  assert.equal(result.total, 10);
  assert.equal(result.awarded, true);
  for (let i = 0; i < 4; i++) {
    result = await rpc("claim_login_bonus");
    assert.equal(result.total, 10);
    assert.equal(result.awarded, false);
  }
  await assert.rejects(
    () =>
      db.query(
        `insert into public.login_rewards(user_id,reward_date,coins) values ('${first}',current_date+1,10)`,
      ),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("update public.login_rewards set coins=1000"),
    /permission denied/,
  );
});
test("RLS and RPC separate account balances and reject anonymous requests", async () => {
  await asUser(second);
  assert.equal(
    (await db.query("select * from public.login_rewards")).rows.length,
    0,
  );
  assert.equal((await rpc("get_login_bonus")).total, 0);
  assert.equal((await rpc("claim_login_bonus")).total, 10);
  await asUser("");
  await assert.rejects(
    () => rpc("claim_login_bonus"),
    /Authentication required/,
  );
  await db.exec("reset role;set role anon");
  await assert.rejects(() => rpc("claim_login_bonus"), /permission denied/);
});
test("server midnight is in Japan and reapplying migration preserves earned rewards", async () => {
  await db.exec("reset role");
  const dates = (
    await db.query(
      `select (timestamptz '2026-10-22 14:59:59Z' at time zone 'Asia/Tokyo')::date::text as before,(timestamptz '2026-10-22 15:00:00Z' at time zone 'Asia/Tokyo')::date::text as after`,
    )
  ).rows[0];
  assert.equal(dates.before, "2026-10-22");
  assert.equal(dates.after, "2026-10-23");
  await db.exec(sql);
  const rows = (await db.query("select * from public.login_rewards")).rows;
  assert.equal(rows.length, 2);
  assert(rows.every((row) => row.coins === 10));
});
