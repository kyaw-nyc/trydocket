"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay, isToday } from "../utils/date-utils";
import { cn } from "@/lib/utils";

type MiniCalendarProps = {
  baseDate: Date;
  monthMatrix: Date[];
  weekDates: Date[];
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

function MiniCalendarComponent({
  baseDate,
  monthMatrix,
  weekDates,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}: MiniCalendarProps) {
  return (
    <div className="rounded-xl p-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {baseDate.toLocaleString([], { month: "long", year: "numeric" })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full cursor-pointer dark:text-white dark:hover:bg-white/10"
            onClick={onPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full cursor-pointer dark:text-white dark:hover:bg-white/10"
            onClick={onNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 text-[10px] text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`} className="text-center">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {monthMatrix.map((date) => {
          const inCurrentMonth = date.getMonth() === baseDate.getMonth();
          const inWeek = weekDates.some((d) => isSameDay(d, date));
          const today = isToday(date);
          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md text-xs transition-colors cursor-pointer",
                today
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : inWeek
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent",
                !inCurrentMonth && "opacity-50"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const MiniCalendar = memo(MiniCalendarComponent);
