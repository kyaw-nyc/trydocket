"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2, ChevronDown, Check } from "lucide-react";
import { useCalendar, PendingEvent } from "../CalendarContext";
import { CalendarLegendEntry } from "../types/calendar";
import { cn } from "@/lib/utils";

type PendingEventsBannerProps = {
  className?: string;
  ownedCalendars?: CalendarLegendEntry[];
};

function CalendarSelector({
  event,
  calendars,
  onSelect,
}: {
  event: PendingEvent;
  calendars: CalendarLegendEntry[];
  onSelect: (eventId: string, calendarId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedCalendar = calendars.find(c => c.id === event.calendarId) ||
    calendars.find(c => c.isPrimary) ||
    calendars[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (calendars.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent transition-colors"
      >
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: selectedCalendar?.swatch }}
        />
        <span className="max-w-[100px] truncate">{selectedCalendar?.name}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md">
          {calendars.map((cal) => (
            <button
              key={cal.id}
              type="button"
              onClick={() => {
                onSelect(event.id, cal.id);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: cal.swatch }}
              />
              <span className="flex-1 text-left truncate">{cal.name}</span>
              {(event.calendarId === cal.id || (!event.calendarId && cal.isPrimary)) && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingEventsBannerComponent({ className, ownedCalendars = [] }: PendingEventsBannerProps) {
  const { pendingEvents, setPendingEvents, clearPendingEvents, confirmPendingEvents, isConfirming } = useCalendar();

  const handleCalendarSelect = (eventId: string, calendarId: string) => {
    setPendingEvents((prev: PendingEvent[]) =>
      prev.map((e) => (e.id === eventId ? { ...e, calendarId } : e))
    );
  };

  if (pendingEvents.length === 0) return null;

  const showCalendarSelector = ownedCalendars.length > 1;

  return (
    <div
      className={cn(
        "mx-2 sm:mx-4 mt-3 flex flex-col gap-3 rounded-xl border border-border bg-card px-3 sm:px-4 py-3 md:mx-6",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} ready to add
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Review the highlighted previews on your calendar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearPendingEvents}
            disabled={isConfirming}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={confirmPendingEvents}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Calendar"
            )}
          </Button>
        </div>
      </div>

      {/* Show calendar selector for each event when multiple calendars are available */}
      {showCalendarSelector && (
        <div className="border-t border-border pt-3 space-y-2">
          {pendingEvents.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate flex-1">
                {event.summary}
              </span>
              <CalendarSelector
                event={event}
                calendars={ownedCalendars}
                onSelect={handleCalendarSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PendingEventsBanner = memo(PendingEventsBannerComponent);
