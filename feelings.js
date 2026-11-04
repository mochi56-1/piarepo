// Preserve the existing five-level mood for calendars/backups while recording
// the finer expression selected in the new Figma flow.
export const feelings = [
  { label: "最高", mood: 5, color: "#d8a2b8" },
  { label: "いい感じ！", mood: 5, color: "#e2ba98" },
  { label: "いいかも", mood: 4, color: "#add265" },
  { label: "まあまあ", mood: 3, color: "#d8ce83" },
  { label: "びみょう", mood: 2, color: "#abc8d7" },
  { label: "ダメかも", mood: 2, color: "#a3a4c9" },
  { label: "無理", mood: 1, color: "#919aaa" },
];
export const feelingForMood = (mood) =>
  ({ 1: "無理", 2: "びみょう", 3: "まあまあ", 4: "いいかも", 5: "最高" })[
    mood
  ] || "まあまあ";
export function selectedFeeling(label, mood) {
  return (
    feelings.find((f) => f.label === label && f.mood === mood)?.label ||
    feelingForMood(mood)
  );
}
