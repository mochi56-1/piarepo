export const demoBonusKey = "piarepo-login-bonus-demo-v1";
export const tokyoDay = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((value) => value.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};
export function readDemoBonus(storage, date = new Date()) {
  const raw = storage.getItem(demoBonusKey);
  const saved = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(saved)) throw new Error("データを確認できません。");
  const days = [
    ...new Set(
      saved.filter(
        (day) => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day),
      ),
    ),
  ];
  const day = tokyoDay(date);
  return {
    day,
    claimed_today: days.includes(day),
    total: days.length * 10,
    days,
  };
}
export function claimDemoBonus(storage, date = new Date()) {
  const current = readDemoBonus(storage, date);
  if (current.claimed_today)
    return { ...current, awarded: false, awarded_coins: 0 };
  const days = [...current.days, current.day];
  storage.setItem(demoBonusKey, JSON.stringify(days));
  return {
    ...current,
    days,
    total: days.length * 10,
    claimed_today: true,
    awarded: true,
    awarded_coins: 10,
  };
}
