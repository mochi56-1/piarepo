import test from "node:test";
import assert from "node:assert/strict";
import {
  tokyoDay,
  readDemoBonus,
  claimDemoBonus,
  demoBonusKey,
} from "../bonus.js";
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};
test("daily cutoff is midnight Japan time, independent of host timezone", () => {
  assert.equal(tokyoDay(new Date("2026-10-22T14:59:59Z")), "2026-10-22");
  assert.equal(tokyoDay(new Date("2026-10-22T15:00:00Z")), "2026-10-23");
});
test("same-day repeated attempts award exactly ten demo coins", () => {
  const s = storage(),
    now = new Date("2026-10-22T10:00:00Z");
  assert.equal(claimDemoBonus(s, now).total, 10);
  for (let i = 0; i < 10; i++) {
    const result = claimDemoBonus(s, now);
    assert.equal(result.total, 10);
    assert.equal(result.awarded, false);
  }
  assert.equal(readDemoBonus(s, now).claimed_today, true);
});
test("returning after a gap keeps all prior coins without a streak reset", () => {
  const s = storage();
  claimDemoBonus(s, new Date("2026-10-01T10:00:00Z"));
  const result = claimDemoBonus(s, new Date("2026-10-22T10:00:00Z"));
  assert.equal(result.total, 20);
  assert.equal(result.awarded, true);
});
test("failed persistence does not falsely claim success", () => {
  const s = storage();
  s.setItem = () => {
    throw new Error("quota");
  };
  assert.throws(() => claimDemoBonus(s));
  assert.equal(readDemoBonus(s).total, 0);
});
test("corrupt demo data is not silently overwritten and duplicate days do not inflate balance", () => {
  const s = storage();
  s.setItem(demoBonusKey, JSON.stringify(["2026-10-22", "2026-10-22"]));
  assert.equal(readDemoBonus(s).total, 10);
  s.setItem(demoBonusKey, "{bad");
  assert.throws(() => claimDemoBonus(s));
  assert.equal(s.getItem(demoBonusKey), "{bad");
});
