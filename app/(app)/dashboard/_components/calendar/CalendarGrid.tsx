"use client";

import { useRef, useEffect, useState, memo, useMemo, useCallback } from "react";
import { CalendarEvent, ColorsMap, HOUR_HEIGHT } from "../types/calendar";
import { formatDateHeader, isToday, getCurrentTimePosition } from "../utils/date-utils";
import { isSameDay } from "../utils/date-utils";
import { getEventColor } from "../utils/color-utils";
import { TimeGutter } from "./TimeGutter";
import { DayColumn } from "./DayColumn";
import { useCalendar } from "../CalendarContext";
import { useEventDrag, type DragState } from "../hooks/useEventDrag";
import { cn } from "@/lib/utils";
import { RecurringScopeDialog } from "./RecurringScopeDialog";

type RecurringScope = "this" | "following" | "all";

type CalendarGridProps = {
  weekDates: Date[];
  timezoneAbbr: string;
  todayIndex: number;
  getEventsForDay: (date: Date) => CalendarEvent[];
  colors: ColorsMap;
  defaultColor: string | null;
  onSelectEvent: (event: CalendarEvent, position?: { x: number; y: number }) => void;
  onEventUpdate?: (
    eventId: string,
    calendarId: string | undefined,
    newStart: string,
    newEnd: string,
    scope?: RecurringScope,
    recurringEventId?: string
  ) => void;
};

type PendingRecurringDrag = {
  eventId: string;
  calendarId: string | undefined;
  recurringEventId: string;
  newStart: string;
  newEnd: string;
  event: CalendarEvent;
  anchor: { x: number; y: number };
  mode: "move" | "resize";
};

type EventOverride = {
  event: CalendarEvent;
  startDateTime: string;
  endDateTime: string;
};

function CalendarGridComponent({
  weekDates,
  timezoneAbbr,
  todayIndex,
  getEventsForDay,
  colors,
  defaultColor,
  onSelectEvent,
  onEventUpdate,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayColumnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentTimePos, setCurrentTimePos] = useState(getCurrentTimePosition());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevWeekKeyRef = useRef<string>("");
  const { scrollToTime, setScrollToTime } = useCalendar();

  // Optimistic overrides: events that have been dragged but API hasn't refreshed yet
  const [eventOverrides, setEventOverrides] = useState<Map<string, EventOverride>>(new Map());

  // Pending recurring drag — waiting for user to pick a scope
  const [pendingRecurringDrag, setPendingRecurringDrag] = useState<PendingRecurringDrag | null>(null);

  // Helper: apply optimistic override + fire API call
  const applyDragUpdate = useCallback(
    (eventId: string, calendarId: string | undefined, newStart: string, newEnd: string, event: CalendarEvent, scope?: RecurringScope, recurringEventId?: string) => {
      setEventOverrides((prev) => {
        const next = new Map(prev);
        next.set(eventId, { event, startDateTime: newStart, endDateTime: newEnd });
        return next;
      });

      onEventUpdate?.(eventId, calendarId, newStart, newEnd, scope, recurringEventId);

      setTimeout(() => {
        setEventOverrides((prev) => {
          if (!prev.has(eventId)) return prev;
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
      }, 8000);
    },
    [onEventUpdate]
  );

  // Called when drag finishes — intercepts recurring events to show scope dialog
  const handleDragEnd = useCallback(
    (eventId: string, calendarId: string | undefined, newStart: string, newEnd: string, event: CalendarEvent, dropPosition: { x: number; y: number }) => {
      // If the event didn't actually move, do nothing (user dropped it back in place)
      const originalStart = event.start?.dateTime;
      const originalEnd = event.end?.dateTime;
      if (originalStart && originalEnd && newStart === new Date(originalStart).toISOString() && newEnd === new Date(originalEnd).toISOString()) {
        return;
      }

      if (event.recurringEventId) {
        // Recurring event: set optimistic override so it stays at new position, then show dialog
        setEventOverrides((prev) => {
          const next = new Map(prev);
          next.set(eventId, { event, startDateTime: newStart, endDateTime: newEnd });
          return next;
        });

        // Anchor the dialog near the drop position
        setPendingRecurringDrag({
          eventId,
          calendarId,
          recurringEventId: event.recurringEventId,
          newStart,
          newEnd,
          event,
          anchor: dropPosition,
          mode: "move",
        });
        return;
      }

      // Non-recurring: proceed immediately
      applyDragUpdate(eventId, calendarId, newStart, newEnd, event);
    },
    [applyDragUpdate]
  );

  // Handle scope selection from the recurring dialog
  const handleRecurringScopeSelect = useCallback(
    (scope: RecurringScope) => {
      if (!pendingRecurringDrag) return;
      const { eventId, calendarId, newStart, newEnd, event, recurringEventId } = pendingRecurringDrag;

      // The optimistic override is already applied — now fire the API call
      onEventUpdate?.(eventId, calendarId, newStart, newEnd, scope, recurringEventId);

      // Safety net: clear override after 8s
      setTimeout(() => {
        setEventOverrides((prev) => {
          if (!prev.has(eventId)) return prev;
          const next = new Map(prev);
          next.delete(eventId);
          return next;
        });
      }, 8000);

      setPendingRecurringDrag(null);
    },
    [pendingRecurringDrag, onEventUpdate]
  );

  // Handle cancel from recurring dialog — revert optimistic override
  const handleRecurringScopeCancel = useCallback(() => {
    if (pendingRecurringDrag) {
      setEventOverrides((prev) => {
        const next = new Map(prev);
        next.delete(pendingRecurringDrag.eventId);
        return next;
      });
    }
    setPendingRecurringDrag(null);
  }, [pendingRecurringDrag]);

  // Wrap getEventsForDay to apply optimistic overrides
  const getEventsWithOverrides = useCallback(
    (date: Date): CalendarEvent[] => {
      let events = getEventsForDay(date);

      if (eventOverrides.size === 0) return events;

      // Remove events that have overrides (they may have moved to a different day)
      events = events.filter((e) => !eventOverrides.has(e.id));

      // Add overridden events to the correct day
      for (const [, override] of eventOverrides) {
        const overrideDate = new Date(override.startDateTime);
        if (isSameDay(overrideDate, date)) {
          events.push({
            ...override.event,
            start: { ...override.event.start, dateTime: override.startDateTime },
            end: { ...override.event.end, dateTime: override.endDateTime },
          });
        }
      }

      return events;
    },
    [getEventsForDay, eventOverrides]
  );

  const { dragState, isDraggingRef, handlePointerDown, overlayRef, labelRef } = useEventDrag({
    weekDates,
    dayColumnRefs,
    scrollContainerRef: scrollRef,
    onDragEnd: handleDragEnd,
    onSelect: onSelectEvent,
  });

  const handleSelectEvent = useCallback(
    (event: CalendarEvent, position?: { x: number; y: number }) => {
      if (isDraggingRef.current) return;
      onSelectEvent(event, position);
    },
    [onSelectEvent, isDraggingRef]
  );

  // Ensure dayColumnRefs array is the right size
  if (dayColumnRefs.current.length !== weekDates.length) {
    dayColumnRefs.current = new Array(weekDates.length).fill(null);
  }

  // Create a unique key for the current week
  const weekKey = useMemo(() => {
    return weekDates[0]?.toISOString() || "";
  }, [weekDates]);

  // Trigger fade effect when week changes
  useEffect(() => {
    if (prevWeekKeyRef.current && prevWeekKeyRef.current !== weekKey) {
      const start = setTimeout(() => setIsTransitioning(true), 0);
      const end = setTimeout(() => setIsTransitioning(false), 200);
      prevWeekKeyRef.current = weekKey;
      return () => {
        clearTimeout(start);
        clearTimeout(end);
      };
    }
    prevWeekKeyRef.current = weekKey;
  }, [weekKey]);

  // Update current time position every second for precise tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current time on mount (with 1 hour padding above)
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const targetHour = Math.max(0, currentHour - 1);
      scrollRef.current.scrollTop = targetHour * HOUR_HEIGHT;
    }
  }, []);

  // Scroll to specific time when scrollToTime changes
  useEffect(() => {
    if (scrollToTime && scrollRef.current) {
      const hour = scrollToTime.getHours();
      const minutes = scrollToTime.getMinutes();
      const seconds = scrollToTime.getSeconds();
      const targetHour = Math.max(0, hour + minutes / 60 + seconds / 3600 - 1);
      const scrollPosition = targetHour * HOUR_HEIGHT;

      scrollRef.current.scrollTo({
        top: scrollPosition,
        behavior: "smooth",
      });

      setScrollToTime(null);
    }
  }, [scrollToTime, setScrollToTime]);

  // Get overlay color from drag state
  const overlayColor = useMemo(() => {
    if (!dragState) return { background: "#039be5" };
    return getEventColor(dragState.item.event, colors, defaultColor);
  }, [dragState, colors, defaultColor]);

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0 flex-col transition-opacity duration-200",
        isTransitioning ? "opacity-60" : "opacity-100"
      )}
    >
      {/* Spacer for floating nav */}
      <div className="h-14 flex-shrink-0" />
      {/* Day headers */}
      <div className="flex border-b border-border/50 px-2 sm:px-4 md:px-6">
        <div className="w-10 sm:w-14 flex-shrink-0 pr-1 sm:pr-2">
          <span className="text-[9px] sm:text-[10px] font-medium tracking-wide text-muted-foreground/60">
            {timezoneAbbr}
          </span>
        </div>
        {weekDates.map((date) => {
          const { day, date: dateNum } = formatDateHeader(date);
          const today = isToday(date);
          return (
            <div
              key={date.toISOString()}
              className="flex flex-1 flex-col items-center pb-2 sm:pb-3 text-center min-w-0"
            >
              <span className={cn(
                "text-[9px] sm:text-[10px] font-medium tracking-wide",
                today ? "text-foreground" : "text-muted-foreground/70"
              )}>{day}</span>
              <span
                className={cn(
                  "mt-0.5 sm:mt-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-sm sm:text-base font-semibold transition-colors",
                  today
                    ? "bg-foreground text-background"
                    : "text-foreground"
                )}
              >
                {dateNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 pb-34 md:px-6 touch-pan-y">
        <div className="relative flex" style={{ height: HOUR_HEIGHT * 24 }}>
          <TimeGutter />
          <div className="relative flex flex-1 min-w-0 pl-10 sm:pl-14">
            {weekDates.map((date, dayIndex) => (
              <DayColumn
                key={date.toISOString()}
                ref={(el) => { dayColumnRefs.current[dayIndex] = el; }}
                date={date}
                dayIndex={dayIndex}
                events={getEventsWithOverrides(date)}
                colors={colors}
                defaultColor={defaultColor}
                currentTimePos={currentTimePos}
                showTimeLine={todayIndex === dayIndex}
                onSelectEvent={handleSelectEvent}
                onDragStart={handlePointerDown}
                dragEventId={dragState?.eventId ?? null}
              />
            ))}

            {/* Drag overlay — only visible while actively dragging */}
            {dragState && (
              <DragOverlay
                dragState={dragState}
                overlayRef={overlayRef}
                labelRef={labelRef}
                overlayColor={overlayColor}
                dayColumnRefs={dayColumnRefs}
              />
            )}
          </div>
        </div>
      </div>

      {/* Recurring scope dialog */}
      {pendingRecurringDrag && (
        <RecurringScopeDialog
          anchor={pendingRecurringDrag.anchor}
          eventSummary={pendingRecurringDrag.event.summary || ""}
          action={pendingRecurringDrag.mode}
          onSelect={handleRecurringScopeSelect}
          onCancel={handleRecurringScopeCancel}
        />
      )}
    </div>
  );
}

/** Overlay rendered during active drag */
function DragOverlay({
  dragState,
  overlayRef,
  labelRef,
  overlayColor,
  dayColumnRefs,
}: {
  dragState: DragState;
  overlayRef: React.RefObject<HTMLDivElement | null>;
  labelRef: React.RefObject<HTMLDivElement | null>;
  overlayColor: { background: string };
  dayColumnRefs: React.RefObject<(HTMLDivElement | null)[]>;
}) {
  const col = dayColumnRefs.current?.[dragState.originDayIndex];
  let initialLeft = 0;
  let initialWidth = 100;

  if (col) {
    const gridContainer = col.parentElement;
    if (gridContainer) {
      const gridRect = gridContainer.getBoundingClientRect();
      const colRect = col.getBoundingClientRect();
      const colLeft = colRect.left - gridRect.left;
      initialLeft = colLeft + (dragState.item.leftPercent / 100) * colRect.width;
      initialWidth = (dragState.item.widthPercent / 100) * colRect.width;
    }
  }

  return (
    <div
      ref={overlayRef}
      className="absolute rounded-lg px-2 py-1 text-xs font-semibold pointer-events-none z-30 overflow-hidden"
      style={{
        top: dragState.item.top,
        height: dragState.item.height,
        left: `${initialLeft}px`,
        width: `${initialWidth}px`,
        backgroundColor: overlayColor.background,
        opacity: 0.85,
        borderLeft: `2px solid rgba(0,0,0,0.2)`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        color: "#fff",
      }}
    >
      <p className="truncate text-[10px] sm:text-[11px] font-semibold leading-tight">
        {dragState.item.event.summary || "Untitled"}
      </p>
      <div
        ref={labelRef}
        className="mt-0.5 text-[8px] sm:text-[9px] font-medium opacity-90"
      />
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridComponent);
