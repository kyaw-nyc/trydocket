"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  X,
  MapPin,
  FileText,
  Users,
  Clock,
  Repeat,
  Loader2,
} from "lucide-react";
import { DetailedEvent } from "../types/calendar";
import { formatDateRange } from "../utils/date-utils";
import { EventEditDialog } from "./EventEditDialog";

type EventDetailsSheetProps = {
  open: boolean;
  eventId: string;
  calendarId?: string;
  onClose: () => void;
  onUpdated?: () => void;
};

export function EventDetailsSheet({
  open,
  eventId,
  calendarId,
  onClose,
  onUpdated,
}: EventDetailsSheetProps) {
  const [event, setEvent] = useState<DetailedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !eventId) return;

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
  }, [eventId, calendarId, open]);

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
      (url) => `<a href="${url}" class="text-primary underline hover:no-underline" target="_blank" rel="noreferrer">${url}</a>`
    );
  };

  const handleSave = useCallback(
    async (updates: { summary?: string; colorId?: string }) => {
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
    },
    [eventId, calendarId, onUpdated]
  );

  const handleDelete = useCallback(async () => {
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
  }, [eventId, calendarId, onUpdated, onClose]);

  const getInitials = (name?: string, email?: string) => {
    const str = name || email || "?";
    return str.slice(0, 2).toUpperCase();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "declined":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "tentative":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Sheet open={open && !editing} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-md p-0" showCloseButton={false}>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle className="sr-only">Event details</SheetTitle>
                {loading ? (
                  <Skeleton className="h-7 w-48" />
                ) : (
                  <SheetTitle className="text-xl font-semibold leading-tight truncate">
                    {event?.summary || "Untitled event"}
                  </SheetTitle>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!loading && event && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setEditing(true)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="px-6 py-4 space-y-4 overflow-hidden">
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : event ? (
                <>
                  {/* Date & Time */}
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {formatDateRange(event.start?.dateTime, event.end?.dateTime)}
                      </p>
                      {recurrenceLabel(event.recurrence) && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <Repeat className="h-3.5 w-3.5" />
                          <span>{recurrenceLabel(event.recurrence)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3 min-w-0">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm break-all overflow-hidden">{event.location}</p>
                      </div>
                    </>
                  )}

                  {/* Description */}
                  {event.description && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div
                          className="text-sm whitespace-pre-wrap break-all max-h-48 overflow-auto overflow-x-hidden min-w-0 flex-1"
                          dangerouslySetInnerHTML={{ __html: linkify(event.description) }}
                        />
                      </div>
                    </>
                  )}

                  {/* Attendees */}
                  {event.attendees && event.attendees.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium">Guests ({event.attendees.length})</p>
                          <div className="space-y-2">
                            {event.attendees.map((attendee, i) => (
                              <div
                                key={`${attendee.email}-${i}`}
                                className="flex items-center gap-3"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(attendee.displayName, attendee.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {attendee.displayName || attendee.email}
                                  </p>
                                  {attendee.displayName && attendee.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {attendee.email}
                                    </p>
                                  )}
                                </div>
                                {attendee.responseStatus && (
                                  <Badge
                                    variant="secondary"
                                    className={getStatusColor(attendee.responseStatus)}
                                  >
                                    {attendee.responseStatus}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Event not found</p>
              )}

              {saving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {event && editing && (
        <EventEditDialog
          open={editing}
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
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
