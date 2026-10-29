import { buildBackup, parseBackup } from "./backup.js";
import { loadPlanner } from "./planner.js";
export function validateAccountDocument(document) {
  if (
    !document ||
    !Array.isArray(document.notes) ||
    !Array.isArray(document.planner?.tasks) ||
    !Array.isArray(document.planner?.events)
  )
    throw Error("記録の形式が正しくありません。");
  parseBackup(JSON.stringify(buildBackup(document.notes)));
  const planner = loadPlanner({
    getItem: () => JSON.stringify(document.planner),
  });
  if (
    planner.tasks.length !== document.planner.tasks.length ||
    planner.events.length !== document.planner.events.length
  )
    throw Error("タスク・予定の形式が正しくありません。");
  for (const items of [document.planner.tasks, document.planner.events]) {
    if (
      new Set(items.map((n) => n.id)).size !== items.length ||
      items.some((n) => !Number.isFinite(n.id))
    )
      throw Error("記録のIDが正しくありません。");
  }
  return document;
}
export const buildAccountBackup = (document) => ({
  format: "piarepo-account-v1",
  document: validateAccountDocument(document),
});
export function parseAccountBackup(text) {
  const data = JSON.parse(text);
  if (data?.format !== "piarepo-account-v1")
    throw Error("全記録バックアップを選んでください。");
  return validateAccountDocument(data.document);
}
export function mergeAccountDocuments(current, incoming) {
  validateAccountDocument(current);
  validateAccountDocument(incoming);
  const merge = (a, b) => [
    ...a,
    ...b.filter((n) => !a.some((x) => x.id === n.id)),
  ];
  return {
    notes: merge(current.notes, incoming.notes),
    planner: {
      tasks: merge(current.planner.tasks, incoming.planner.tasks),
      events: merge(current.planner.events, incoming.planner.events),
    },
  };
}
