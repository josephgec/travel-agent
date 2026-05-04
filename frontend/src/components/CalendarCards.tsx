import { format, parseISO } from "date-fns";
import { Calendar, CalendarPlus, ExternalLink } from "lucide-react";

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
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 text-sm">
      <div className="px-4 py-2 border-b border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
        <Calendar size={14} />
        <span>{fmtRange(result.time_min, result.time_max)}</span>
        <span className="ml-auto">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
      </div>
      <ul className="divide-y divide-neutral-800">
        {events.map((e) => (
          <EventRow key={e.id ?? e.summary} event={e} />
        ))}
        {events.length === 0 && (
          <li className="px-4 py-6 text-center text-neutral-500">No travel events found.</li>
        )}
      </ul>
    </div>
  );
}

export function CalendarEventCreatedCard({ result }: { result: CalendarEventCreatedResult }) {
  return (
    <div className="rounded-md border border-emerald-900 bg-emerald-950/30 text-sm">
      <div className="px-4 py-2 border-b border-emerald-900 text-emerald-300 text-xs flex items-center gap-2 font-medium">
        <CalendarPlus size={14} />
        Event created
      </div>
      <div className="px-4 py-3">
        <EventRow event={result} compact />
      </div>
    </div>
  );
}

function EventRow({ event, compact = false }: { event: Event; compact?: boolean }) {
  return (
    <div className={`${compact ? "" : "px-4 py-3"} space-y-1`}>
      <div className="flex items-baseline gap-2">
        <span className="text-neutral-100 font-medium">{event.summary ?? "Untitled"}</span>
        {event.all_day && (
          <span className="text-xs text-neutral-500 font-mono uppercase">all-day</span>
        )}
      </div>
      <div className="text-xs text-neutral-400 flex flex-wrap gap-3">
        <span>{fmtWhen(event.start, event.end, event.all_day)}</span>
        {event.location && <span>📍 {event.location}</span>}
        {event.attendees.length > 0 && (
          <span>{event.attendees.length} attendee{event.attendees.length === 1 ? "" : "s"}</span>
        )}
        {event.html_link && (
          <a
            href={event.html_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-neutral-400 hover:text-neutral-200"
          >
            open <ExternalLink size={11} />
          </a>
        )}
      </div>
      {event.description && !compact && (
        <div className="text-xs text-neutral-500 line-clamp-2">{event.description}</div>
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
    if (sameDay(s, e)) {
      return `${format(s, "MMM d, yyyy h:mm a")} – ${format(e, "h:mm a")}`;
    }
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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
