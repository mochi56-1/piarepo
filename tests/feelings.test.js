import test from "node:test";
import assert from "node:assert/strict";
import { feelings, selectedFeeling } from "../feelings.js";
import { buildBackup, parseBackup } from "../backup.js";
test("seven refined expressions preserve the existing five-level mood and backup contract", () => {
  assert.equal(feelings.length, 7);
  for (const f of feelings) {
    const note = {
      id: 1,
      title: "",
      body: "ひとこと",
      name: "あなた",
      date: "2026-11-04",
      mood: f.mood,
      feeling: f.label,
      visibility: "private",
      comments: [],
    };
    assert.equal(
      parseBackup(JSON.stringify(buildBackup([note])))[0].feeling,
      f.label,
    );
    assert.equal(selectedFeeling(f.label, f.mood), f.label);
  }
});
test("older notes remain readable and unsupported or contradictory expressions are rejected", () => {
  assert.equal(selectedFeeling(undefined, 3), "まあまあ");
  assert.equal(selectedFeeling("最高", 1), "無理");
  const note = {
    id: 1,
    title: "",
    body: "記録",
    name: "あなた",
    date: "2026-11-04",
    mood: 3,
    visibility: "private",
    comments: [],
  };
  assert.equal(parseBackup(JSON.stringify(buildBackup([note]))).length, 1);
  assert.throws(() =>
    parseBackup(
      JSON.stringify(buildBackup([{ ...note, feeling: { label: "object" } }])),
    ),
  );
  assert.throws(() =>
    parseBackup(JSON.stringify(buildBackup([{ ...note, feeling: "最高" }]))),
  );
});
