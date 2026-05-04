import { format, parseISO } from "date-fns";
import { Calendar, CalendarPlus, ExternalLink } from "lucide-react";
import { D_DISPLAY, D_MONO, D_PAL, D_SCRIPT, D_SERIF } from "../design/postcard/tokens";

type Event = {
  id: string | null;
  summary: string | null;
  location: string | null;
  description: string | null;
  start: string | null;
  end: string | null;
  all_day: boolean;
  html_link: string | null;
  status: string | null;
  attendees: string[];
};

export type CalendarEventsResult = {
  display_hint: "calendar_events";
  time_min: string;
  time_max: string;
  events: Event[];
};

export type CalendarEventCreatedResult = Event & {
  display_hint: "calendar_event_created";
};

export function CalendarEventsCard({ result }: { result: CalendarEventsResult }) {
  const { events } = result;
  return (
    <div style={{ background: D_PAL.paper, border: `0.5px solid ${D_PAL.rule}`, boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}` }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `0.5px dashed ${D_PAL.rule}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: D_PAL.paperWarm,
        }}
      >
        <Calendar size={14} style={{ color: D_PAL.accent }} />
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14, color: D_PAL.accent }}>calendar —</span>
        <span style={{ fontFamily: D_MONO, fontSize: 11, color: D_PAL.ink2, letterSpacing: 0.5 }}>
          {fmtRange(result.time_min, result.time_max)}
        </span>
        <span style={{ marginLeft: "auto", fontFamily: D_MONO, fontSize: 9.5, color: D_PAL.muted, letterSpacing: 1 }}>
          {events.length} EVENT{events.length === 1 ? "" : "S"}
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {events.map((e, i) => (
          <li
            key={e.id ?? e.summary}
            style={{
              padding: "10px 16px",
              borderBottom: i < events.length - 1 ? `0.5px dashed ${D_PAL.rule}` : "none",
            }}
          >
            <EventRow event={e} />
          </li>
        ))}
        {events.length === 0 && (
          <li style={{ padding: "20px 16px", textAlign: "center", fontFamily: D_SERIF, fontStyle: "italic", color: D_PAL.muted }}>
            No travel events found.
          </li>
        )}
      </ul>
    </div>
  );
}

export function CalendarEventCreatedCard({ result }: { result: CalendarEventCreatedResult }) {
  return (
    <div
      style={{
        background: "#e9f0e3",
        border: `0.5px solid ${D_PAL.green}`,
        boxShadow: `3px 3px 0 ${D_PAL.ruleSoft}`,
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `0.5px dashed ${D_PAL.green}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: D_PAL.green,
        }}
      >
        <CalendarPlus size={14} />
        <span style={{ fontFamily: D_SCRIPT, fontSize: 14 }}>good —</span>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 13, fontWeight: 600 }}>event created</span>
      </div>
      <div style={{ padding: "12px 16px" }}>
        <EventRow event={result} compact />
      </div>
    </div>
  );
}

function EventRow({ event, compact = false }: { event: Event; compact?: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: D_DISPLAY, fontSize: 15, fontWeight: 600 }}>{event.summary ?? "Untitled"}</span>
        {event.all_day && (
          <span style={{ fontFamily: D_MONO, fontSize: 9, color: D_PAL.muted, letterSpacing: 1 }}>ALL-DAY</span>
        )}
      </div>
      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          fontFamily: D_SERIF,
          fontStyle: "italic",
          fontSize: 12.5,
          color: D_PAL.ink3,
        }}
      >
        <span>{fmtWhen(event.start, event.end, event.all_day)}</span>
        {event.location && <span>📍 {event.location}</span>}
        {event.attendees.length > 0 && (
          <span>
            {event.attendees.length} attendee{event.attendees.length === 1 ? "" : "s"}
          </span>
        )}
        {event.html_link && (
          <a
            href={event.html_link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontFamily: D_MONO,
              fontStyle: "normal",
              fontSize: 10,
              color: D_PAL.accent,
              textDecoration: "none",
              letterSpacing: 0.5,
            }}
          >
            OPEN <ExternalLink size={10} />
          </a>
        )}
      </div>
      {event.description && !compact && (
        <div style={{ fontFamily: D_SERIF, fontSize: 12, color: D_PAL.muted, marginTop: 4 }}>{event.description}</div>
      )}
    </div>
  );
}

function fmtWhen(start: string | null, end: string | null, allDay: boolean): string {
  if (!start) return "—";
  try {
    const s = parseISO(start);
    if (allDay) return format(s, "MMM d, yyyy");
    if (!end) return format(s, "MMM d, yyyy h:mm a");
    const e = parseISO(end);
    if (sameDay(s, e)) return `${format(s, "MMM d, yyyy h:mm a")} – ${format(e, "h:mm a")}`;
    return `${format(s, "MMM d h:mm a")} – ${format(e, "MMM d h:mm a")}`;
  } catch {
    return `${start}${end ? ` – ${end}` : ""}`;
  }
}

function fmtRange(timeMin: string, timeMax: string): string {
  try {
    return `${format(parseISO(timeMin), "MMM d")} – ${format(parseISO(timeMax), "MMM d, yyyy")}`;
  } catch {
    return `${timeMin} – ${timeMax}`;
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
