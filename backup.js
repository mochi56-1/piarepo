export function buildBackup(notes) {
  return {
    format: "piarepo-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    notes,
  };
}
const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};
export function parseBackup(text) {
  const data = JSON.parse(text);
  if (
    !data ||
    data.format !== "piarepo-backup" ||
    data.version !== 1 ||
    !Array.isArray(data.notes)
  )
    throw new Error("ぴあれぽの対応するバックアップファイルを選んでください。");
  const ids = new Set();
  for (const note of data.notes) {
    if (
      !note ||
      typeof note !== "object" ||
      typeof note.id !== "number" ||
      !Number.isFinite(note.id) ||
      ids.has(note.id) ||
      typeof note.title !== "string" ||
      typeof note.body !== "string" ||
      typeof note.name !== "string" ||
      !validDate(note.date) ||
      !Number.isInteger(note.mood) ||
      note.mood < 1 ||
      note.mood > 5 ||
      !["private", "public"].includes(note.visibility) ||
      !Array.isArray(note.comments) ||
      note.comments.some(
        (c) => typeof c !== "string" && (!c || typeof c.text !== "string"),
      ) ||
      (note.image != null && typeof note.image !== "string") ||
      (note.reflections != null &&
        (!Array.isArray(note.reflections) ||
          note.reflections.some(
            (r) =>
              !r ||
              typeof r.text !== "string" ||
              !Number.isFinite(Date.parse(r.createdAt)),
          ))) ||
      (note.history != null &&
        (!Array.isArray(note.history) ||
          note.history.some(
            (h) =>
              !h ||
              typeof h.title !== "string" ||
              typeof h.body !== "string" ||
              (h.image != null && typeof h.image !== "string") ||
              !Number.isFinite(Date.parse(h.editedAt)),
          )))
    )
      throw new Error(
        "記録の形式を確認できませんでした。元のバックアップファイルを選んでください。",
      );
    ids.add(note.id);
  }
  return data.notes;
}
export function mergeBackup(current, incoming) {
  const merged = new Map(current.map((note) => [note.id, note]));
  incoming.forEach((note) => merged.set(note.id, note));
  return [...merged.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
  );
}
