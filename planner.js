export const plannerKey = "piarepo-planner";
export const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const timeMinutes = (value) => {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    return NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
export function validateEvent(event) {
  const parsed =
    typeof event?.date === "string"
      ? new Date(event.date + "T12:00:00Z")
      : new Date(NaN);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === event.date &&
    typeof event.id === "number" &&
    Number.isFinite(event.id) &&
    !!event &&
    typeof event.title === "string" &&
    !!event.title.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") &&
    Number.isFinite(timeMinutes(event.start)) &&
    timeMinutes(event.end) > timeMinutes(event.start)
  );
}
export function loadPlanner(storage) {
  try {
    const saved = JSON.parse(storage.getItem(plannerKey));
    return {
      tasks: Array.isArray(saved?.tasks)
        ? saved.tasks
            .filter(
              (t) =>
                t &&
                typeof t.id === "number" &&
                typeof t.title === "string" &&
                Number.isFinite(t.x) &&
                Number.isFinite(t.y),
            )
            .map((t) => ({
              ...t,
              x: Math.min(95, Math.max(5, t.x)),
              y: Math.min(95, Math.max(5, t.y)),
            }))
        : [],
      events: Array.isArray(saved?.events)
        ? saved.events.filter(validateEvent)
        : [],
    };
  } catch {
    return { tasks: [], events: [] };
  }
}
export function layoutEvents(events) {
  const ends = [];
  const sorted = events
    .slice()
    .sort((a, b) => timeMinutes(a.start) - timeMinutes(b.start));
  const placed = sorted.map((event) => {
    let column = ends.findIndex((end) => end <= timeMinutes(event.start));
    if (column < 0) column = ends.length;
    ends[column] = Math.max(
      timeMinutes(event.end),
      timeMinutes(event.start) + 33,
    );
    return { ...event, column };
  });
  return placed.map((event) => ({
    ...event,
    columns: Math.max(1, ends.length),
  }));
}
