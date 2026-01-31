"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CalendarEvent,
  ColorsMap,
  UserCalendar,
  DEFAULT_COLOR,
  PENDING_COLOR,
  CalendarLegendEntry,
} from "../types/calendar";
import { useCalendar, PendingEvent } from "../CalendarContext";
import { isSameDay } from "../utils/date-utils";

type UseCalendarEventsOptions = {
  weekDates: Date[];
  autoRefreshInterval?: number;
  prefetchWeeks?: number;
};

const DEFAULT_AUTO_REFRESH_INTERVAL = 30000;
const DEFAULT_PREFETCH_WEEKS = 4;

export function useCalendarEvents({
  weekDates,
  autoRefreshInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
  prefetchWeeks = DEFAULT_PREFETCH_WEEKS,
}: UseCalendarEventsOptions) {
  const { refreshKey, pendingEvents } = useCalendar();

  // Core state
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [colors, setColors] = useState<ColorsMap>({});
  const [calendarColors, setCalendarColors] = useState<ColorsMap>({});
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [defaultColor, setDefaultColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // For triggering manual refreshes
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  // Refs to prevent race conditions
  const fetchIdRef = useRef(0);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // STEP 1: Fetch events from API
  // ============================================
  useEffect(() => {
    if (!weekDates.length) return;

    async function fetchEvents() {
      const currentWeekStart = new Date(weekDates[0]);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekEnd = new Date(weekDates[6]);
      currentWeekEnd.setHours(23, 59, 59, 999);

      // Extended range for prefetching
      const timeMin = new Date(currentWeekStart);
      timeMin.setDate(timeMin.getDate() - prefetchWeeks * 7);
      const timeMax = new Date(currentWeekEnd);
      timeMax.setDate(timeMax.getDate() + prefetchWeeks * 7);

      const currentFetchId = ++fetchIdRef.current;
      setLoading(true);

      // Abort previous fetch
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`,
          { signal: controller.signal }
        );

        if (currentFetchId !== fetchIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setColors(data.colors || {});
          setCalendarColors(data.calendarColors || {});
          setCalendars(data.calendars || []);
          setDefaultColor(data.defaultColor || null);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch events:", error);
        }
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    }

    fetchEvents();
  }, [weekDates, refreshKey, prefetchWeeks, localRefreshKey]);

  // ============================================
  // STEP 2: Select only primary calendar when calendars first load
  // ============================================
  const hasSetInitialSelectionRef = useRef(false);

  useEffect(() => {
    if (!calendars.length) return;

    // Only set initial selection once when calendars first load
    if (hasSetInitialSelectionRef.current) {
      // After initial load, just validate existing selection
      setSelectedCalendarIds((prev) => {
        const validIds = prev.filter((id) =>
          calendars.some((cal) => cal.id === id)
        );
        if (validIds.length > 0) return validIds;

        // Fallback to primary if current selection became invalid
        const primaryCal = calendars.find((c) => c.primary);
        if (primaryCal?.id) return [primaryCal.id];
        if (calendars[0]?.id) return [calendars[0].id];
        return [];
      });
      return;
    }

    // First load - always select only the primary calendar
    hasSetInitialSelectionRef.current = true;
    const primaryCal = calendars.find((c) => c.primary);
    if (primaryCal?.id) {
      setSelectedCalendarIds([primaryCal.id]);
    } else if (calendars[0]?.id) {
      setSelectedCalendarIds([calendars[0].id]);
    }
  }, [calendars]);

  // ============================================
  // STEP 3: Auto-refresh when tab becomes visible
  // ============================================
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startAutoRefresh = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          setLocalRefreshKey((k) => k + 1);
        }
      }, autoRefreshInterval);
    };

    const stopAutoRefresh = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setLocalRefreshKey((k) => k + 1);
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    if (document.visibilityState === "visible") {
      startAutoRefresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopAutoRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshInterval]);

  // ============================================
  // DERIVED DATA: Filter events by selected calendars
  // ============================================
  const filteredEvents = useMemo(() => {
    if (selectedCalendarIds.length === 0) {
      // Nothing selected - show nothing (or could show all)
      return [];
    }
    return events.filter((event) => {
      // If event has no calendarId, include it (legacy support)
      if (!event.calendarId) return true;
      return selectedCalendarIds.includes(event.calendarId);
    });
  }, [events, selectedCalendarIds]);

  // Pending events converted to calendar format
  const pendingCalendarEvents = useMemo<CalendarEvent[]>(
    () =>
      pendingEvents.map((pe: PendingEvent) => ({
        id: pe.id,
        summary: pe.summary,
        start: { dateTime: pe.startDateTime },
        end: { dateTime: pe.endDateTime },
        location: pe.location,
        isPending: true,
      })),
    [pendingEvents]
  );

  // All events to display = filtered real events + pending events
  const allEvents = useMemo(
    () => [...filteredEvents, ...pendingCalendarEvents],
    [filteredEvents, pendingCalendarEvents]
  );

  // Calendar legend for sidebar
  const calendarLegend = useMemo<CalendarLegendEntry[]>(() => {
    const entries = calendars.map((cal) => {
      const swatch =
        cal.backgroundColor ||
        (cal.colorId && calendarColors[cal.colorId]?.background) ||
        defaultColor ||
        DEFAULT_COLOR.background;
      return {
        id: cal.id,
        name: cal.summary || (cal.primary ? "Default calendar" : "Untitled"),
        swatch,
        isPrimary: !!cal.primary,
        isOwned: cal.accessRole === "owner",
        accessRole: cal.accessRole,
      };
    });

    // Add pending events entry if any
    if (pendingEvents.length > 0) {
      entries.push({
        id: "preview",
        name: "Pending events",
        swatch: PENDING_COLOR.background,
        isPrimary: false,
        isOwned: false,
        accessRole: undefined,
      });
    }

    return entries;
  }, [calendars, calendarColors, defaultColor, pendingEvents]);

  // ============================================
  // ACTIONS
  // ============================================
  const toggleCalendar = useCallback((id: string) => {
    setSelectedCalendarIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setLocalRefreshKey((k) => k + 1);
  }, []);

  const getEventsForDay = useCallback(
    (date: Date): CalendarEvent[] => {
      return allEvents.filter((event) => {
        const eventStart = event.start?.dateTime || event.start?.date;
        if (!eventStart) return false;
        return isSameDay(new Date(eventStart), date);
      });
    },
    [allEvents]
  );

  return {
    events: filteredEvents,
    allEvents,
    colors,
    calendarColors,
    calendars,
    selectedCalendarIds,
    defaultColor,
    loading,
    calendarLegend,
    handleRefresh,
    getEventsForDay,
    toggleCalendar,
  };
}
