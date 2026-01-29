"use client";

import { useState, useCallback, useEffect } from "react";
import { useCalendar } from "./CalendarContext";
import { CalendarEvent } from "./types/calendar";
import { useCalendarNavigation } from "./hooks/useCalendarNavigation";
import { useCalendarEvents } from "./hooks/useCalendarEvents";
import {
  CalendarHeader,
  CalendarSidebar,
  CalendarGrid,
  PendingEventsBanner,
} from "./calendar";
import { EventDetailsSheet } from "./events";
import { cn } from "@/lib/utils";

export default function CalendarPanel() {
  const { theme, setTheme } = useCalendar();
  const isDark = theme === "dark";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<{
    id: string;
    calendarId?: string;
  } | null>(null);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Navigation hook
  const {
    weekDates,
    timezoneAbbr,
    weekLabel,
    todayIndex,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToDate,
  } = useCalendarNavigation();

  // Events hook with auto-refresh every 30 seconds
  // Note: Shorter intervals (e.g., 5000ms) will increase Google API usage significantly
  const {
    colors,
    defaultColor,
    loading,
    calendarLegend,
    selectedCalendarIds,
    handleRefresh,
    getEventsForDay,
    toggleCalendar,
  } = useCalendarEvents({ weekDates, autoRefreshInterval: 30000 });

  const { triggerRefresh } = useCalendar();

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.isPending) return;
    setSelectedEventDetail({ id: event.id, calendarId: event.calendarId });
  }, []);

  const handleCloseEventDetails = useCallback(() => {
    setSelectedEventDetail(null);
  }, []);

  return (
    <div className={cn("flex h-full w-full", isDark ? "dark" : "")}>
      <div className="flex h-full w-full bg-background">
        {/* Sidebar */}
        <CalendarSidebar
          isOpen={sidebarOpen}
          weekDates={weekDates}
          calendars={calendarLegend}
          selectedCalendarIds={selectedCalendarIds}
          onSelectDate={goToDate}
          onToggleCalendar={toggleCalendar}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <CalendarHeader
            weekLabel={weekLabel}
            loading={loading}
            isDark={isDark}
            onToggleSidebar={handleToggleSidebar}
            onToday={goToToday}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}
            onRefresh={handleRefresh}
            onToggleTheme={handleToggleTheme}
          />

          <div
            className={cn(
              "flex flex-1 min-h-0 flex-col transition-all duration-200",
              !isMobile && sidebarOpen ? "md:pl-60" : "md:pl-0"
            )}
          >
            <PendingEventsBanner />

            <CalendarGrid
              weekDates={weekDates}
              timezoneAbbr={timezoneAbbr}
              todayIndex={todayIndex}
              getEventsForDay={getEventsForDay}
              colors={colors}
              defaultColor={defaultColor}
              onSelectEvent={handleSelectEvent}
            />
          </div>

          {/* Event Details Sheet */}
          {selectedEventDetail && (
            <EventDetailsSheet
              open={!!selectedEventDetail}
              eventId={selectedEventDetail.id}
              calendarId={selectedEventDetail.calendarId}
              onClose={handleCloseEventDetails}
              onUpdated={triggerRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}
