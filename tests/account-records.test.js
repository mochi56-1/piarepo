import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAccountBackup,
  parseAccountBackup,
  mergeAccountDocuments,
} from "../accountRecords.js";
const doc = {
  notes: [
    {
      id: 1,
      title: "",
      body: "秘密",
      name: "あなた",
      date: "2026-10-29",
      mood: 3,
      visibility: "private",
      comments: [],
      image: "data:image/png;base64,AAAA",
    },
  ],
  planner: {
    tasks: [{ id: 2, title: "やること", x: 50, y: 50, done: false }],
    events: [
      {
        id: 3,
        title: "予定",
        date: "2026-10-29",
        start: "09:00",
        end: "10:00",
        taskId: 2,
      },
    ],
  },
};
test("account backup includes private image notes and linked tasks and schedules", () =>
  assert.deepEqual(
    parseAccountBackup(JSON.stringify(buildAccountBackup(doc))),
    doc,
  ));
test("account import preserves existing IDs and refuses malformed planner data", () => {
  const incoming = structuredClone(doc);
  incoming.notes[0].body = "other";
  incoming.planner.tasks.push({ id: 4, title: "new", x: 20, y: 20 });
  const merged = mergeAccountDocuments(doc, incoming);
  assert.equal(merged.notes[0].body, "秘密");
  assert.equal(merged.planner.tasks.length, 2);
  incoming.planner.events[0].end = "07:00";
  assert.throws(() => mergeAccountDocuments(doc, incoming));
});

test("restoring additional notes never opts them into friend sharing", () => {
  const empty = { notes: [], planner: { tasks: [], events: [] } };
  const imported = structuredClone(doc);
  imported.notes[0].shareToFriends = true;
  imported.notes[0].visibility = "public";
  const result = mergeAccountDocuments(empty, imported);
  assert.equal(result.notes[0].shareToFriends, false);
  assert.equal(result.notes[0].visibility, "private");
  const current = structuredClone(imported);
  assert.equal(
    mergeAccountDocuments(current, imported).notes[0].shareToFriends,
    true,
  );
});
