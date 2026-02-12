"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { CalendarEvent, DetailedEvent } from "../types/calendar";
import { EventColorPicker } from "./EventColorPicker";
import { formatDateRange } from "../utils/date-utils";
import { useCalendar } from "../CalendarContext";
import { cn } from "@/lib/utils";
import {
  Pencil,
  X,
  MapPin,
  FileText,
  Users,
  Clock,
  Repeat,
  Loader2,
  Trash2,
  Check,
} from "lucide-react";

type EventPopoverProps = {
  eventId: string;
  calendarId?: string;
  initialEvent?: CalendarEvent;
  anchor: { x: number; y: number };
  onClose: () => void;
  onUpdated?: () => void;
};

const POPOVER_WIDTH = 340;
const POPOVER_PADDING = 12;

function computePosition(anchor: { x: number; y: number }, isMobile: boolean) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (isMobile) {
    return {
      top: vh * 0.3,
      left: Math.max(POPOVER_PADDING, (vw - Math.min(POPOVER_WIDTH, vw - 24)) / 2),
    };
  }

  // Estimate height ~300px for initial render
  const estHeight = 300;
  let top = anchor.y - estHeight / 2;
  let left = anchor.x + 16;

  if (left + POPOVER_WIDTH + POPOVER_PADDING > vw) {
    left = anchor.x - POPOVER_WIDTH - 16;
  }
  if (left < POPOVER_PADDING) left = POPOVER_PADDING;
  if (top < POPOVER_PADDING) top = POPOVER_PADDING;
  if (top + estHeight + POPOVER_PADDING > vh) {
    top = vh - estHeight - POPOVER_PADDING;
  }

  return { top, left };
}

function toLocalDatetimeString(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventPopover({
  eventId,
  calendarId,
  initialEvent,
  anchor,
  onClose,
  onUpdated,
}: EventPopoverProps) {
  const { theme } = useCalendar();
  const isDark = theme === "dark";
  const popoverRef = useRef<HTMLDivElement>(null);

  // Use initial CalendarEvent data immediately, upgrade to DetailedEvent in background
  const [event, setEvent] = useState<DetailedEvent | null>(
    initialEvent
      ? {
          id: initialEvent.id,
          summary: initialEvent.summary,
          description: initialEvent.description,
          location: initialEvent.location,
          start: initialEvent.start ? { dateTime: initialEvent.start.dateTime } : undefined,
          end: initialEvent.end ? { dateTime: initialEvent.end.dateTime } : undefined,
          colorId: initialEvent.colorId,
        }
      : null
  );
  const [loading, setLoading] = useState(!initialEvent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isRecurring = !!(initialEvent?.recurringEventId || event?.recurrence?.length);

  // Edit state
  const [editSummary, setEditSummary] = useState(initialEvent?.summary || "");
  const [editColorId, setEditColorId] = useState(initialEvent?.colorId || "");
  const [editLocation, setEditLocation] = useState(initialEvent?.location || "");
  const [editDescription, setEditDescription] = useState(initialEvent?.description || "");
  const [editStart, setEditStart] = useState(toLocalDatetimeString(initialEvent?.start?.dateTime));
  const [editEnd, setEditEnd] = useState(toLocalDatetimeString(initialEvent?.end?.dateTime));

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 640, []);

  // Compute position immediately from anchor — no waiting for render
  const position = useMemo(() => computePosition(anchor, isMobile), [anchor, isMobile]);

  const [visible, setVisible] = useState(false);

  // Animate in on mount + disable body scroll
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Refine position after content renders (adjust for actual height)
  useEffect(() => {
    if (!popoverRef.current || isMobile) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom > vh - POPOVER_PADDING) {
      popoverRef.current.style.top = `${Math.max(POPOVER_PADDING, vh - rect.height - POPOVER_PADDING)}px`;
    }
  });

  // Fetch full event details in background (for attendees, recurrence, etc.)
  useEffect(() => {
    let active = true;
    async function fetchEvent() {
      try {
        const query = calendarId ? `?calendarId=${calendarId}` : "";
        const res = await fetch(`/api/calendar/events/${eventId}${query}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.event) {
            setEvent(data.event);
            // Only update edit fields if user hasn't started editing
            if (!editing) {
              setEditSummary(data.event.summary || "");
              setEditColorId(data.event.colorId || "");
              setEditLocation(data.event.location || "");
              setEditDescription(data.event.description || "");
              setEditStart(toLocalDatetimeString(data.event.start?.dateTime));
              setEditEnd(toLocalDatetimeString(data.event.end?.dateTime));
            }
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchEvent();
    return () => { active = false; };
  }, [eventId, calendarId, editing]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const recurrenceLabel = (recurrence?: string[]) => {
    if (!recurrence || !recurrence.length) return null;
    return recurrence[0].replace("RRULE:", "");
  };

  const sanitizeDescription = (text?: string) => {
    if (!text) return "";
    // Google Calendar descriptions may contain <a> tags and <br> tags already.
    // Strip all HTML tags except <a> and <br>, then style the links.
    const cleaned = text
      // Preserve <a ...> and </a> and <br> tags, strip everything else
      .replace(/<(?!\/?a[\s>]|\/?br[\s>/])[^>]*>/gi, "")
      // Add styling to existing <a> tags for visibility
      .replace(/<a\s/gi, `<a class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" `)
      // Convert newlines to <br>
      .replace(/\n/g, "<br>");

    // Also linkify bare URLs not already inside <a> tags
    return cleaned.replace(
      /(?<![">])(https?:\/\/[^\s<>"]+)/g,
      (url) => `<a href="${url}" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer">${url}</a>`
    );
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const query = calendarId ? `?calendarId=${calendarId}` : "";
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      const updates: Record<string, unknown> = {
        summary: editSummary,
        colorId: editColorId || undefined,
        location: editLocation,
        description: editDescription,
      };

      if (editStart) {
        updates.startDateTime = new Date(editStart).toISOString();
        updates.timeZone = userTz;
      }
      if (editEnd) {
        updates.endDateTime = new Date(editEnd).toISOString();
        updates.timeZone = userTz;
      }

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
  }, [eventId, calendarId, editSummary, editColorId, editLocation, editDescription, editStart, editEnd, onUpdated]);

  const handleDelete = useCallback(async (scope?: "this" | "all") => {
    setSaving(true);
    try {
      // For "all" on a recurring event, delete using the recurring series ID
      const targetId = scope === "all" && initialEvent?.recurringEventId
        ? initialEvent.recurringEventId
        : eventId;
      const query = calendarId ? `?calendarId=${calendarId}` : "";
      const res = await fetch(`/api/calendar/events/${targetId}${query}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onUpdated?.();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [eventId, calendarId, initialEvent?.recurringEventId, onUpdated, onClose]);

  const startEditing = useCallback(() => {
    if (event) {
      setEditSummary(event.summary || "");
      setEditColorId(event.colorId || "");
      setEditLocation(event.location || "");
      setEditDescription(event.description || "");
      setEditStart(toLocalDatetimeString(event.start?.dateTime));
      setEditEnd(toLocalDatetimeString(event.end?.dateTime));
    }
    setEditing(true);
  }, [event]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    if (event) {
      setEditSummary(event.summary || "");
      setEditColorId(event.colorId || "");
      setEditLocation(event.location || "");
      setEditDescription(event.description || "");
      setEditStart(toLocalDatetimeString(event.start?.dateTime));
      setEditEnd(toLocalDatetimeString(event.end?.dateTime));
    }
  }, [event]);

  const getInitials = (name?: string, email?: string) => {
    const str = name || email || "?";
    return str.slice(0, 2).toUpperCase();
  };

  const inputClass = cn(
    "w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors",
    isDark
      ? "bg-white/10 border-white/10 text-white placeholder-white/30 focus:border-white/30"
      : "bg-black/5 border-black/10 text-gray-900 placeholder-black/30 focus:border-black/30"
  );

  const labelClass = cn("text-[11px] font-medium mb-1 block", isDark ? "text-white/50" : "text-black/50");

  const popoverContent = (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[80]" onClick={onClose} />

      {/* Popover */}
      <div
        ref={popoverRef}
        className={cn(
          "fixed z-[81] rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-100",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95",
          isDark
            ? "bg-black/70 border border-white/15 text-white"
            : "bg-white/80 border border-black/10 text-gray-900",
          isMobile ? "w-[calc(100vw-24px)]" : "w-[340px]"
        )}
        style={{
          top: position.top,
          left: position.left,
          transformOrigin: "center center",
        }}
      >
        {!event && loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin opacity-50" />
          </div>
        ) : event ? (
          <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="Event title"
                    className={cn(
                      "w-full text-lg font-semibold bg-transparent border-b outline-none pb-1",
                      isDark ? "border-white/20 focus:border-white/40" : "border-black/10 focus:border-black/30"
                    )}
                    autoFocus
                  />
                ) : (
                  <h3 className="text-lg font-semibold leading-tight truncate">
                    {event.summary || "Untitled event"}
                  </h3>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {!editing && (
                  <>
                    <button
                      onClick={startEditing}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-full transition-colors",
                        isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      )}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className={cn(
                        "h-7 w-7 flex items-center justify-center rounded-full transition-colors",
                        "text-destructive/70 hover:text-destructive",
                        isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      )}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-full transition-colors",
                    isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                  )}
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Date & Time */}
            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Start</label>
                  <input
                    type="datetime-local"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End</label>
                  <input
                    type="datetime-local"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <Clock className={cn("h-4 w-4 mt-0.5 shrink-0", isDark ? "text-white/40" : "text-black/40")} />
                <div>
                  <p className="text-sm font-medium">
                    {formatDateRange(event.start?.dateTime, event.end?.dateTime)}
                  </p>
                  {recurrenceLabel(event.recurrence) && (
                    <div className={cn("flex items-center gap-1 mt-0.5 text-xs", isDark ? "text-white/40" : "text-black/40")}>
                      <Repeat className="h-3 w-3" />
                      <span>{recurrenceLabel(event.recurrence)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {editing ? (
              <div>
                <label className={labelClass}>Location</label>
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Add location"
                  className={inputClass}
                />
              </div>
            ) : event.location ? (
              <div className="flex items-start gap-2.5">
                <MapPin className={cn("h-4 w-4 mt-0.5 shrink-0", isDark ? "text-white/40" : "text-black/40")} />
                <p className="text-sm break-all">{event.location}</p>
              </div>
            ) : null}

            {/* Description */}
            {editing ? (
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add description"
                  rows={3}
                  className={cn(inputClass, "resize-none")}
                />
              </div>
            ) : event.description ? (
              <div className="flex items-start gap-2.5">
                <FileText className={cn("h-4 w-4 mt-0.5 shrink-0", isDark ? "text-white/40" : "text-black/40")} />
                <div
                  className="text-sm whitespace-pre-wrap break-all max-h-24 overflow-auto flex-1 min-w-0"
                  dangerouslySetInnerHTML={{ __html: sanitizeDescription(event.description) }}
                />
              </div>
            ) : null}

            {/* Attendees (view only) */}
            {!editing && event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Users className={cn("h-4 w-4 mt-0.5 shrink-0", isDark ? "text-white/40" : "text-black/40")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium mb-1.5">Guests ({event.attendees.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {event.attendees.slice(0, 5).map((attendee, i) => (
                      <div
                        key={`${attendee.email}-${i}`}
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-medium",
                          isDark ? "bg-white/15" : "bg-black/10"
                        )}
                        title={attendee.displayName || attendee.email}
                      >
                        {getInitials(attendee.displayName, attendee.email)}
                      </div>
                    ))}
                    {event.attendees.length > 5 && (
                      <div
                        className={cn(
                          "h-7 px-2 rounded-full flex items-center justify-center text-[10px] font-medium",
                          isDark ? "bg-white/15" : "bg-black/10"
                        )}
                      >
                        +{event.attendees.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Color picker in edit mode */}
            {editing && (
              <div>
                <label className={labelClass}>Color</label>
                <EventColorPicker selectedColorId={editColorId} onSelect={setEditColorId} />
              </div>
            )}

            {/* Action buttons — only shown when editing or confirming delete */}
            {editing && (
              <div className={cn("flex items-center gap-2 pt-2 border-t", isDark ? "border-white/10" : "border-black/10")}>
                <button
                  onClick={cancelEditing}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-xs font-medium transition-colors",
                    isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    "flex-1 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1",
                    isDark ? "bg-white/20 hover:bg-white/30" : "bg-black/10 hover:bg-black/20"
                  )}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
              </div>
            )}
            {!editing && showDeleteConfirm && (
              <div className={cn("flex flex-col gap-2 pt-2 border-t", isDark ? "border-white/10" : "border-black/10")}>
                <p className="text-xs text-destructive font-medium">
                  {isRecurring ? "Delete recurring event?" : "Delete this event?"}
                </p>
                {isRecurring ? (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => handleDelete("this")}
                      disabled={saving}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      This event only
                    </button>
                    <button
                      onClick={() => handleDelete("all")}
                      disabled={saving}
                      className="h-8 px-3 rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      All events in series
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-medium transition-colors",
                        isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      )}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className={cn(
                        "flex-1 h-8 px-3 rounded-lg text-xs font-medium transition-colors",
                        isDark ? "hover:bg-white/10" : "hover:bg-black/5"
                      )}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete()}
                      disabled={saving}
                      className="flex-1 h-8 px-3 rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center justify-center gap-1"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <p className={cn("text-sm", isDark ? "text-white/50" : "text-black/50")}>Event not found</p>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(popoverContent, document.body);
}
