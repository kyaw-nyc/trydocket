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
import { EventPopover } from "./events";
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
    event?: CalendarEvent;
  } | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number; y: number } | null>(null);

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
  const {
    colors,
    defaultColor,
    loading,
    calendarLegend,
    calendars,
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

  const handleSelectEvent = useCallback((event: CalendarEvent, position?: { x: number; y: number }) => {
    if (event.isPending) return;
    setSelectedEventDetail({ id: event.id, calendarId: event.calendarId, event });
    setPopoverAnchor(position || { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, []);

  const handleCloseEventDetails = useCallback(() => {
    setSelectedEventDetail(null);
    setPopoverAnchor(null);
  }, []);

  const handleEventUpdate = useCallback(
    async (eventId: string, calendarId: string | undefined, newStart: string, newEnd: string) => {
      try {
        const query = calendarId ? `?calendarId=${encodeURIComponent(calendarId)}` : "";
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        await fetch(`/api/calendar/events/${encodeURIComponent(eventId)}${query}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startDateTime: newStart,
            endDateTime: newEnd,
            timeZone,
          }),
        });
      } catch {
        // Network error — refresh will restore original position
      } finally {
        triggerRefresh();
      }
    },
    [triggerRefresh]
  );

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
            onEventUpdate={handleEventUpdate}
          />
        </div>
      </div>

      {/* Event Popover */}
      {selectedEventDetail && popoverAnchor && (
        <EventPopover
          eventId={selectedEventDetail.id}
          calendarId={selectedEventDetail.calendarId}
          initialEvent={selectedEventDetail.event}
          anchor={popoverAnchor}
          onClose={handleCloseEventDetails}
          onUpdated={triggerRefresh}
        />
      )}

      {/* Chat Popup - centered on calendar area */}
      <ChatPopup
        sidebarOpen={sidebarOpen}
        isMobile={isMobile}
        calendars={calendars}
        selectedCalendarIds={selectedCalendarIds}
        onEnableCalendar={toggleCalendar}
      />
    </div>
  );
}
