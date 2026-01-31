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
} from "./calendar";
import { EventDetailsSheet } from "./events";
import ChatPopup from "./ChatPopup";
import { cn } from "@/lib/utils";

export default function CalendarPanel() {
  const { theme, setTheme, setGoToDate } = useCalendar();
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

  // Register navigation function in context so ChatPopup can navigate to event dates
  useEffect(() => {
    setGoToDate(goToDate);
  }, [goToDate, setGoToDate]);


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
    <div className={cn("flex h-full w-full flex-col", isDark ? "dark" : "")}>
      {/* Header - spans full width */}
      <CalendarHeader
        weekLabel={weekLabel}
        loading={loading}
        isDark={isDark}
        isViewingCurrentWeek={todayIndex >= 0}
        onToggleSidebar={handleToggleSidebar}
        onToday={goToToday}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onRefresh={handleRefresh}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main content area - sidebar and calendar side by side */}
      <div className="flex flex-1 min-h-0 bg-background overflow-hidden">
        {/* Sidebar - inline, not fixed */}
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

        {/* Calendar grid - stretch vertically a bit */}
        <div className="flex flex-1 flex-col overflow-hidden min-h-[82vh]">
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

      {/* Chat Popup - centered on calendar area */}
      <ChatPopup sidebarOpen={sidebarOpen} isMobile={isMobile} />
    </div>
  );
}
