"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { CalendarEvent, ColorsMap, UserCalendar, STORAGE_KEY, DEFAULT_COLOR, PENDING_COLOR, CalendarLegendEntry } from "../types/calendar";
import { useCalendar, PendingEvent } from "../CalendarContext";
import { isSameDay } from "../utils/date-utils";

type UseCalendarEventsOptions = {
  weekDates: Date[];
  autoRefreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
  prefetchWeeks?: number; // number of weeks to prefetch before and after current week
};

const DEFAULT_AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
const DEFAULT_PREFETCH_WEEKS = 4; // fetch 4 weeks before and after

export function useCalendarEvents({
  weekDates,
  autoRefreshInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
  prefetchWeeks = DEFAULT_PREFETCH_WEEKS
}: UseCalendarEventsOptions) {
  const { refreshKey, pendingEvents } = useCalendar();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [colors, setColors] = useState<ColorsMap>({});
  const [calendarColors, setCalendarColors] = useState<ColorsMap>({});
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [hasLoadedSelection, setHasLoadedSelection] = useState(false);
  const [defaultColor, setDefaultColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const fetchControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0); // Track fetch requests to handle race conditions

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

  const allEvents = useMemo<CalendarEvent[]>(
    () => [...events, ...pendingCalendarEvents],
    [events, pendingCalendarEvents]
  );

  const calendarLegend = useMemo<CalendarLegendEntry[]>(() => {
    const entries =
      calendars.map((cal) => {
        const swatch =
          cal.backgroundColor ||
          (cal.colorId && calendarColors[cal.colorId || ""]?.background) ||
          defaultColor ||
          DEFAULT_COLOR.background;
        return {
          id: cal.id,
          name: cal.summary || (cal.primary ? "Default calendar" : "Untitled calendar"),
          swatch,
          isPrimary: !!cal.primary,
        };
      }) || [];

    if (pendingEvents.length) {
      entries.push({
        id: "preview",
        name: "Pending events",
        swatch: PENDING_COLOR.background,
        isPrimary: false,
      });
    }

    if (!entries.length) {
      return [
        {
          id: "default",
          name: "Default calendar",
          swatch: defaultColor || DEFAULT_COLOR.background,
          isPrimary: true,
        },
      ];
    }

    return entries;
  }, [calendars, calendarColors, defaultColor, pendingEvents]);

  const updateSelection = useCallback(
    (next: string[] | ((prev: string[]) => string[])) =>
      setSelectedCalendarIds((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const normalized = Array.from(new Set(resolved.filter(Boolean)));
        if (normalized.length === prev.length && normalized.every((id, i) => id === prev[i])) {
          return prev;
        }
        return normalized;
      }),
    []
  );

  // Load saved selection from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          updateSelection(ids);
        }
      } catch {
        // ignore malformed data
      }
    }
    setHasLoadedSelection(true);
  }, [updateSelection]);

  // Reconcile selection with available calendars; fallback to primary/first if none
  useEffect(() => {
    if (!hasLoadedSelection || !calendars.length) return;
    updateSelection((prev) => {
      const available = new Set(calendars.map((c) => c.id));
      const filtered = prev.filter((id) => available.has(id));
      if (filtered.length) return filtered;
      const primaryId = calendars.find((c) => c.primary)?.id || calendars[0]?.id;
      return primaryId ? [primaryId] : [];
    });
  }, [calendars, hasLoadedSelection, updateSelection]);

  // Persist selection
  useEffect(() => {
    if (!hasLoadedSelection || typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCalendarIds));
  }, [selectedCalendarIds, hasLoadedSelection]);

  // Fetch events - simplified without complex caching to avoid race conditions
  useEffect(() => {
    if (!hasLoadedSelection) return;
    if (calendars.length > 0 && selectedCalendarIds.length === 0) {
      setEvents([]);
      return;
    }

    async function fetchEvents() {
      if (!weekDates.length) return;

      const currentWeekStart = new Date(weekDates[0]);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekEnd = new Date(weekDates[6]);
      currentWeekEnd.setHours(23, 59, 59, 999);

      // Calculate extended range: ±prefetchWeeks for smoother navigation
      const timeMin = new Date(currentWeekStart);
      timeMin.setDate(timeMin.getDate() - prefetchWeeks * 7);
      const timeMax = new Date(currentWeekEnd);
      timeMax.setDate(timeMax.getDate() + prefetchWeeks * 7);

      // Increment fetch ID to track this request
      const currentFetchId = ++fetchIdRef.current;

      setLoading(true);

      // Abort previous fetch if still running
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}${
            selectedCalendarIds.length ? `&calendarIds=${selectedCalendarIds.join(",")}` : ""
          }`,
          { signal: controller.signal }
        );

        // Only update state if this is still the most recent fetch
        if (currentFetchId !== fetchIdRef.current) {
          return;
        }

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
        // Only update loading state if this is still the most recent fetch
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    }
    fetchEvents();
  }, [weekDates, localRefreshKey, refreshKey, selectedCalendarIds, hasLoadedSelection, calendars.length, prefetchWeeks]);

  const handleRefresh = useCallback(() => {
    // Force fresh data by incrementing refresh key
    setLocalRefreshKey((k) => k + 1);
  }, []);

  // Auto-refresh: only when tab is visible to save API calls
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
        // Refresh immediately when tab becomes visible
        setLocalRefreshKey((k) => k + 1);
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    // Start if currently visible
    if (document.visibilityState === "visible") {
      startAutoRefresh();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAutoRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefreshInterval]);

  const getEventsForDay = useCallback((date: Date): CalendarEvent[] => {
    return allEvents.filter((event) => {
      const eventStart = event.start?.dateTime || event.start?.date;
      if (!eventStart) return false;
      const eventDate = new Date(eventStart);
      return isSameDay(eventDate, date);
    });
  }, [allEvents]);

  const toggleCalendar = useCallback((id: string) => {
    updateSelection((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((c) => c !== id) : [...prev, id];
      return next;
    });
  }, [updateSelection]);

  return {
    events,
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
