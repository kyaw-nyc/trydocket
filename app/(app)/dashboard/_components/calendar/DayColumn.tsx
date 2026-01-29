"use client";

import { memo } from "react";
import { CalendarEvent, ColorsMap, HOURS, HOUR_HEIGHT } from "../types/calendar";
import { isToday } from "../utils/date-utils";
import { layoutDayEvents } from "../utils/layout-utils";
import { EventCard } from "./EventCard";
import { CurrentTimeLine } from "./CurrentTimeLine";

type DayColumnProps = {
  date: Date;
  events: CalendarEvent[];
  colors: ColorsMap;
  defaultColor: string | null;
  currentTimePos: number;
  showTimeLine: boolean;
  onSelectEvent: (event: CalendarEvent) => void;
};

function DayColumnComponent({
  date,
  events,
  colors,
  defaultColor,
  currentTimePos,
  showTimeLine,
  onSelectEvent,
}: DayColumnProps) {
  const laidOut = layoutDayEvents(events);
  const today = isToday(date);

  return (
    <div className="relative flex-1 border-l border-border">
      {/* Hour lines */}
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute w-full border-t border-border/40"
          style={{ top: hour * HOUR_HEIGHT }}
        />
      ))}

      {/* Today shading */}
      {today && (
        <div className="absolute inset-0 -z-10 bg-primary/5" />
      )}

      {/* Current time line */}
      {showTimeLine && <CurrentTimeLine top={currentTimePos} />}

      {/* Events */}
      {laidOut.map((item) => (
        <EventCard
          key={item.event.id}
          item={item}
          colors={colors}
          defaultColor={defaultColor}
          onSelect={onSelectEvent}
        />
      ))}
    </div>
  );
}

export const DayColumn = memo(DayColumnComponent);
