"use client";

import { useEffect, useState } from "react";

import EventModal from "./EventModal";

export type DetailedEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string };
  recurrence?: string[];
  colorId?: string;
};

type Props = {
  eventId: string;
  calendarId?: string;
  theme: "light" | "dark";
  onClose: () => void;
  onUpdated?: () => void;
};

export default function EventDetailsModal({ eventId, calendarId, theme, onClose, onUpdated }: Props) {
  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isDark = theme === "dark";

  useEffect(() => {
    let active = true;
    async function fetchEvent() {
      setLoading(true);
      try {
        const query = calendarId ? `?calendarId=${calendarId}` : "";
        const res = await fetch(`/api/calendar/events/${eventId}${query}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setEvent(data.event);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchEvent();
    return () => {
      active = false;
    };
  }, [eventId, calendarId]);

  const formatRange = (start?: string, end?: string) => {
    if (!start) return "";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    const dateLabel = startDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const timeLabel = `${timeFormatter.format(startDate)}${endDate ? ` – ${timeFormatter.format(endDate)}` : ""}`;
    return `${dateLabel} · ${timeLabel}`;
  };

  const recurrenceLabel = (recurrence?: string[]) => {
    if (!recurrence || !recurrence.length) return null;
    const rule = recurrence[0];
    return rule.replace("RRULE:", "");
  };

  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const linkify = (text?: string) => {
    if (!text) return "";
    const escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s<>"]+)/g,
      (url) => `<a href="${url}" class="underline" target="_blank" rel="noreferrer">${url}</a>`
    );
  };

  const handleSave = async (updates: {
    summary?: string;
    colorId?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
  }) => {
    setSaving(true);
    try {
      const query = calendarId ? `?calendarId=${calendarId}` : "";
      const res = await fetch(`/api/calendar/events/${eventId}${query}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setEditing(false);
        onUpdated?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    try {
      const query = calendarId ? `?calendarId=${calendarId}` : "";
      const res = await fetch(`/api/calendar/events/${eventId}${query}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onUpdated?.();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!event && loading) return null;
  if (!event) return null;

  // When editing, render the edit modal only (avoid stacking over detail card)
  if (editing) {
    return (
      <EventModal
        event={{
          id: event.id,
          summary: event.summary,
          colorId: event.colorId,
          start: event.start,
          end: event.end,
        }}
        onClose={() => {
          setEditing(false);
          onClose();
        }}
        onSave={async (_id, updates) =>
          handleSave({
            summary: updates.summary,
            colorId: updates.colorId,
          })
        }
        onDelete={handleDelete}
        theme={theme}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-4 ${
          isDark ? "bg-[#1f1f22] text-white" : "bg-white text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: "var(--event-color, #5c6bc0)" }}
            />
            <h2 className="text-xl font-semibold leading-tight">{event.summary || "Untitled event"}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className={`flex h-9 w-9 items-center justify-center rounded-full cursor-pointer ${
                isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-gray-700"
              }`}
              title="Edit"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 19.5 3 21l1.5-4.5 12.232-12.232z"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className={`flex h-9 w-9 items-center justify-center rounded-full cursor-pointer ${
                isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-black/5 hover:bg-black/10 text-gray-700"
              }`}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm opacity-80">{formatRange(event.start?.dateTime, event.end?.dateTime)}</p>
        {recurrenceLabel(event.recurrence) && (
          <p className="text-xs opacity-70">{recurrenceLabel(event.recurrence)}</p>
        )}

        {event.location && (
          <div className="mt-3 flex items-start gap-2 text-sm">
            <span className="mt-0.5">📍</span>
            <span className="break-words">{event.location}</span>
          </div>
        )}

        {event.description && (
          <div className="mt-3 flex items-start gap-2 text-sm break-words">
            <span className="mt-0.5">📝</span>
            <span
              className="max-h-48 overflow-auto whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: linkify(event.description) }}
            />
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="mt-3 text-sm">
            <p className="font-medium">Guests</p>
            <ul className="mt-1 space-y-1">
              {event.attendees.map((a, i) => (
                <li key={`${a.email}-${i}`} className="opacity-80">
                  {a.displayName || a.email}
                  {a.responseStatus ? ` · ${a.responseStatus}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {saving && <p className="mt-3 text-xs opacity-60">Saving…</p>}
      </div>
    </div>
  );
}
