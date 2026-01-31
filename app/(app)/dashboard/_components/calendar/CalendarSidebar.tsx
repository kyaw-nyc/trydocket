"use client";

import { memo, useState, useMemo, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MiniCalendar } from "./MiniCalendar";
import { CalendarList } from "./CalendarList";
import { CalendarLegendEntry } from "../types/calendar";
import { getMonthMatrix } from "../utils/date-utils";
import { cn } from "@/lib/utils";

type CalendarSidebarProps = {
  isOpen: boolean;
  weekDates: Date[];
  calendars: CalendarLegendEntry[];
  selectedCalendarIds: string[];
  onSelectDate: (date: Date) => void;
  onToggleCalendar: (id: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
};

function CalendarSidebarComponent({
  isOpen,
  weekDates,
  calendars,
  selectedCalendarIds,
  onSelectDate,
  onToggleCalendar,
  onClose,
  isMobile = false,
}: CalendarSidebarProps) {
  // Mini calendar has its own month state, independent of main calendar
  const [miniCalendarDate, setMiniCalendarDate] = useState(() => new Date());

  // Compute month matrix for mini calendar
  const miniCalendarMonthMatrix = useMemo(
    () => getMonthMatrix(miniCalendarDate),
    [miniCalendarDate]
  );

  // Navigate mini calendar to previous month (doesn't affect main calendar)
  const handlePreviousMonth = useCallback(() => {
    setMiniCalendarDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });
  }, []);

  // Navigate mini calendar to next month (doesn't affect main calendar)
  const handleNextMonth = useCallback(() => {
    setMiniCalendarDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  }, []);

  // When selecting a date, navigate main calendar AND update mini calendar view
  const handleSelectDate = useCallback((date: Date) => {
    setMiniCalendarDate(date);
    onSelectDate(date);
  }, [onSelectDate]);

  const sidebarContent = (
    <>
      <div className="px-3 pt-2">
        <MiniCalendar
          baseDate={miniCalendarDate}
          monthMatrix={miniCalendarMonthMatrix}
          weekDates={weekDates}
          onSelectDate={handleSelectDate}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
      </div>
      <div className="mt-2 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
        <CalendarList
          calendars={calendars}
          selectedIds={selectedCalendarIds}
          onToggle={onToggleCalendar}
        />
      </div>
    </>
  );

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Calendar Navigation</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Inline sidebar (not fixed) - part of the same layout as calendar
  return (
    <aside
      className={cn(
        "hidden w-60 shrink-0 md:flex md:flex-col bg-background transition-all duration-200 overflow-hidden",
        isOpen ? "w-60" : "w-0"
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto w-60">
        {sidebarContent}
      </div>
    </aside>
  );
}

export const CalendarSidebar = memo(CalendarSidebarComponent);
