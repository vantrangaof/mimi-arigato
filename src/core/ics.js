// Calendar files (.ics) so your calendar app can do the alerts a web app can't schedule.

const RRULE = { day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY" };
const escape = (s) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

// One event with an alert. day: "YYYY-MM-DD"; time: "HH:MM" or null (all-day, alert at 9 am);
// repeat: null | "day" | "week" | "month" | "year".
export function calendarEvent({ uid, day, time = null, repeat = null, summary, description = "" }) {
  const ymd = day.replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const url = location.protocol.startsWith("http") ? location.href.split(/[?#]/)[0] : "";
  const details = [description, url].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mimi Arigato//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@mimi-arigato`,
    `DTSTAMP:${stamp}`,
    ...(time ? [`DTSTART:${ymd}T${time.replace(":", "")}00`, "DURATION:PT5M"] : [`DTSTART;VALUE=DATE:${ymd}`]),
    ...(repeat ? [`RRULE:FREQ=${RRULE[repeat]}`] : []),
    `SUMMARY:${escape(summary)}`,
    ...(details ? [`DESCRIPTION:${escape(details)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(summary)}`,
    `TRIGGER:${time ? "PT0M" : "PT9H"}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
