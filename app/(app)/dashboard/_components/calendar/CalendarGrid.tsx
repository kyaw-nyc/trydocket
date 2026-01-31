"use client";

import { useRef, useEffect, useState, memo, useMemo } from "react";
import { CalendarEvent, ColorsMap, HOUR_HEIGHT } from "../types/calendar";
import { formatDateHeader, isToday, getCurrentTimePosition } from "../utils/date-utils";
import { TimeGutter } from "./TimeGutter";
import { DayColumn } from "./DayColumn";
import { cn } from "@/lib/utils";

type CalendarGridProps = {
  weekDates: Date[];
  timezoneAbbr: string;
  todayIndex: number;
  getEventsForDay: (date: Date) => CalendarEvent[];
  colors: ColorsMap;
  defaultColor: string | null;
  onSelectEvent: (event: CalendarEvent) => void;
};

function CalendarGridComponent({
  weekDates,
  timezoneAbbr,
  todayIndex,
  getEventsForDay,
  colors,
  defaultColor,
  onSelectEvent,
}: CalendarGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentTimePos, setCurrentTimePos] = useState(getCurrentTimePosition());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevWeekKeyRef = useRef<string>("");

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

  // Update current time position every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  return (
    <div
      className={cn(
        "flex flex-1 min-h-0 flex-col transition-opacity duration-200",
        isTransitioning ? "opacity-60" : "opacity-100"
      )}
    >
      {/* Day headers */}
      <div className="flex border-b border-border px-2 sm:px-4 md:px-6">
        <div className="w-10 sm:w-14 flex-shrink-0 pr-1 sm:pr-2">
          <span className="text-[9px] sm:text-[11px] font-semibold tracking-wide text-muted-foreground">
            {timezoneAbbr}
          </span>
        </div>
        {weekDates.map((date) => {
          const { day, date: dateNum } = formatDateHeader(date);
          const today = isToday(date);
          return (
            <div
              key={date.toISOString()}
              className="flex flex-1 flex-col items-center pb-2 sm:pb-3 text-center text-muted-foreground min-w-0"
            >
              <span className="text-[9px] sm:text-[11px] font-semibold tracking-wide">{day}</span>
              <span
                className={cn(
                  "mt-0.5 sm:mt-1 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full text-sm sm:text-lg font-semibold border transition-colors",
                  today
                    ? "border-foreground text-foreground"
                    : "border-transparent text-foreground"
                )}
              >
                {dateNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 pb-24 md:px-6 touch-pan-y">
        <div className="relative flex" style={{ height: HOUR_HEIGHT * 24 }}>
          <TimeGutter />
          <div className="relative flex flex-1 pl-10 sm:pl-14">
            {weekDates.map((date, dayIndex) => (
              <DayColumn
                key={date.toISOString()}
                date={date}
                events={getEventsForDay(date)}
                colors={colors}
                defaultColor={defaultColor}
                currentTimePos={currentTimePos}
                showTimeLine={todayIndex === dayIndex}
                onSelectEvent={onSelectEvent}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const CalendarGrid = memo(CalendarGridComponent);
