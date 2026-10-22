import test from "node:test";
import assert from "node:assert/strict";
import {
  loadPlanner,
  plannerKey,
  timeMinutes,
  validateEvent,
  layoutEvents,
} from "../planner.js";
const event = (id, start, end) => ({
  id,
  date: "2026-10-22",
  title: "予定",
  start,
  end,
});
test("daily schedules reject invalid clock values, impossible dates and reversed intervals", () => {
  assert.equal(timeMinutes("09:30"), 570);
  for (const value of ["24:00", "9:00", "12:70", "bad"])
    assert(Number.isNaN(timeMinutes(value)));
  assert(validateEvent(event(1, "09:00", "10:00")));
  assert(!validateEvent(event(1, "10:00", "09:00")));
  assert(!validateEvent({ ...event(1, "09:00", "10:00"), date: "2026-02-30" }));
  assert(!validateEvent({ ...event(1, "09:00", "10:00"), title: "   " }));
});
test("overlapping schedules receive different columns without modifying the source", () => {
  const source = [
    event(1, "09:00", "10:00"),
    event(2, "09:15", "09:45"),
    event(3, "10:00", "11:00"),
  ];
  const laid = layoutEvents(source);
  assert.equal(laid[0].column, 0);
  assert.equal(laid[1].column, 1);
  assert.equal(laid[2].column, 0);
  assert.equal(laid[0].columns, 2);
  assert.equal(source[0].column, undefined);
});
test("short adjacent appointments do not overlap at the minimum rendered height", () => {
  const laid = layoutEvents([
    event(1, "09:00", "09:05"),
    event(2, "09:05", "09:10"),
  ]);
  assert.notEqual(laid[0].column, laid[1].column);
});
test("planner loading retains completed tasks, clamps map coordinates and ignores malformed entries", () => {
  const storage = {
    getItem: (key) =>
      key === plannerKey
        ? JSON.stringify({
            tasks: [
              { id: 1, title: "続ける", x: 120, y: -3, done: true },
              { title: null },
            ],
            events: [event(1, "09:00", "10:00"), event(2, "10:00", "09:00")],
          })
        : null,
  };
  const loaded = loadPlanner(storage);
  assert.equal(loaded.tasks.length, 1);
  assert.equal(loaded.tasks[0].done, true);
  assert.equal(loaded.tasks[0].x, 95);
  assert.equal(loaded.tasks[0].y, 5);
  assert.equal(loaded.events.length, 1);
  assert.deepEqual(loadPlanner({ getItem: () => "{invalid" }), {
    tasks: [],
    events: [],
  });
});
