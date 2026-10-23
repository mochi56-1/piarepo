import { validateEvent } from "./planner.js";

// No Calendar API credentials: Google displays a draft for the user to save.
export function googleCalendarUrl(event) {
  if (!validateEvent(event)) return null;
  const stamp = (time) => `${event.date.replaceAll("-", "")}T${time.replace(":", "")}00`;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.search = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(event.end)}`,
    ctz: "Asia/Tokyo",
  }).toString();
  return url.href;
}
