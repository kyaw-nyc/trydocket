"use client";

import { memo, forwardRef } from "react";
import { CalendarEvent, ColorsMap, HOURS, HOUR_HEIGHT, PositionedEvent } from "../types/calendar";
import { isToday } from "../utils/date-utils";
import { layoutDayEvents } from "../utils/layout-utils";
import { EventCard } from "./EventCard";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { DragMode } from "../hooks/useEventDrag";

type DayColumnProps = {
  date: Date;
  dayIndex: number;
  events: CalendarEvent[];
  colors: ColorsMap;
  defaultColor: string | null;
  currentTimePos: number;
  showTimeLine: boolean;
  onSelectEvent: (event: CalendarEvent, position?: { x: number; y: number }) => void;
  onDragStart?: (e: React.PointerEvent, mode: DragMode, item: PositionedEvent, dayIndex: number) => void;
  dragEventId?: string | null;
};

const DayColumnComponent = forwardRef<HTMLDivElement, DayColumnProps>(function DayColumnComponent(
  {
    date,
    dayIndex,
    events,
    colors,
    defaultColor,
    currentTimePos,
    showTimeLine,
    onSelectEvent,
    onDragStart,
    dragEventId,
  },
  ref
) {
  const laidOut = layoutDayEvents(events);
  const today = isToday(date);

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      {/* Vertical day line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-border/30 z-0" aria-hidden />
      {/* Hour lines */}
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 w-full border-t border-border/20 z-0"
          style={{ top: hour * HOUR_HEIGHT }}
        />
      ))}

      {/* Today shading */}
      {today && (
        <div className="absolute inset-0 -z-10 bg-primary/5" />
      )}

      {/* Current time line */}
      {showTimeLine && <CurrentTimeLine top={currentTimePos} />}

      {/* Events - single TooltipProvider for all events in this column */}
      <TooltipProvider delayDuration={200}>
        {laidOut.map((item) => (
          <EventCard
            key={item.event.id}
            item={item}
            colors={colors}
            defaultColor={defaultColor}
            onSelect={onSelectEvent}
            onDragStart={onDragStart}
            dayIndex={dayIndex}
            isDragTarget={dragEventId === item.event.id}
          />
        ))}
      </TooltipProvider>
    </div>
  );
});

export const DayColumn = memo(DayColumnComponent);
