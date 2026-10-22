import test from "node:test";
import assert from "node:assert/strict";
import { buildBackup, parseBackup, mergeBackup } from "../backup.js";
const note = (id, date = "2026-10-22") => ({
  id,
  date,
  title: "",
  body: "私だけの記録",
  name: "あなた",
  mood: 2,
  visibility: "private",
  comments: ["おつかれさま"],
  image: "data:image/png;base64,AAAA",
  reflections: [{ text: "後からの気づき", createdAt: "2026-10-22T10:00:00Z" }],
});
test("backup round trip preserves private notes, attached images and reflections", () => {
  const notes = [note(1)];
  assert.deepEqual(parseBackup(JSON.stringify(buildBackup(notes))), notes);
});
test("restore merges without deleting notes absent from backup; confirmed collisions use incoming version", () => {
  const current = [note(1), note(2, "2026-10-21")];
  const incoming = [
    { ...note(1), body: "バックアップ時点" },
    note(3, "2026-10-23"),
  ];
  const result = mergeBackup(current, incoming);
  assert.deepEqual(
    result.map((n) => n.id),
    [3, 1, 2],
  );
  assert.equal(result.find((n) => n.id === 1).body, "バックアップ時点");
  assert.equal(current[0].body, "私だけの記録");
});
test("invalid backups are rejected before altering any records", () => {
  for (const notes of [
    [note(1), note(1)],
    [{ ...note(1), date: "2026-02-30" }],
    [{ ...note(1), comments: [null] }],
    [{ ...note(1), mood: 8 }],
    [{ ...note(1), reflections: [{}] }],
    [{ ...note(1), history: [{}] }],
  ]) {
    assert.throws(() => parseBackup(JSON.stringify(buildBackup(notes))));
  }
  assert.throws(() => parseBackup("{broken"));
  assert.throws(() =>
    parseBackup(JSON.stringify({ format: "other", version: 1, notes: [] })),
  );
  assert.deepEqual(parseBackup(JSON.stringify(buildBackup([]))), []);
});
