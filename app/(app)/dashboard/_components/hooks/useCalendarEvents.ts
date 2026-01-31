"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  CalendarEvent,
  ColorsMap,
  UserCalendar,
  DEFAULT_COLOR,
  PENDING_COLOR,
  CalendarLegendEntry,
  STORAGE_KEY,
} from "../types/calendar";
import { useCalendar, PendingEvent, PendingDeletion } from "../CalendarContext";
import { isSameDay, getWeekKey } from "../utils/date-utils";
import { expandRecurrence } from "../utils/recurrence-utils";

type UseCalendarEventsOptions = {
  weekDates: Date[];
  autoRefreshInterval?: number;
  prefetchWeeks?: number;
};

const DEFAULT_AUTO_REFRESH_INTERVAL = 60000; // Increased to 60s to reduce API calls
const DEFAULT_PREFETCH_WEEKS = 4;

// Batch all calendar data into single state object to reduce re-renders
type CalendarData = {
  events: CalendarEvent[];
  colors: ColorsMap;
  calendarColors: ColorsMap;
  calendars: UserCalendar[];
  defaultColor: string | null;
};

const INITIAL_DATA: CalendarData = {
  events: [],
  colors: {},
  calendarColors: {},
  calendars: [],
  defaultColor: null,
};

export function useCalendarEvents({
  weekDates,
  autoRefreshInterval = DEFAULT_AUTO_REFRESH_INTERVAL,
  prefetchWeeks = DEFAULT_PREFETCH_WEEKS,
}: UseCalendarEventsOptions) {
  const { refreshKey, pendingEvents, pendingDeletions } = useCalendar();

  // Batched state - single update instead of 5 separate ones
  const [data, setData] = useState<CalendarData>(INITIAL_DATA);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Destructure for convenience
  const { events, colors, calendarColors, calendars, defaultColor } = data;

  // For triggering manual refreshes
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  // Refs to prevent race conditions
  const fetchIdRef = useRef(0);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // STEP 1: Fetch events from API - prioritize current week
  // ============================================
  const hasLoadedCurrentWeekRef = useRef(false);

  useEffect(() => {
    if (!weekDates.length) return;

    async function fetchEvents() {
      const currentWeekStart = new Date(weekDates[0]);
      currentWeekStart.setHours(0, 0, 0, 0);
      const currentWeekEnd = new Date(weekDates[6]);
      currentWeekEnd.setHours(23, 59, 59, 999);

      const currentFetchId = ++fetchIdRef.current;
      setLoading(true);

      // Abort previous fetch
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      // Use cache-busting for manual refreshes (after create/delete actions)
      const cacheBuster = refreshKey > 0 || localRefreshKey > 0 ? `&_t=${Date.now()}` : "";

      try {
        // PHASE 1: Quickly fetch just the current week first
        if (!hasLoadedCurrentWeekRef.current) {
          const quickRes = await fetch(
            `/api/calendar/events?timeMin=${currentWeekStart.toISOString()}&timeMax=${currentWeekEnd.toISOString()}${cacheBuster}`,
            { signal: controller.signal, cache: cacheBuster ? "no-store" : "default" }
          );

          if (currentFetchId !== fetchIdRef.current) return;

          if (quickRes.ok) {
            const quickData = await quickRes.json();
            // Single batched state update instead of 5 separate ones
            setData({
              events: quickData.events || [],
              colors: quickData.colors || {},
              calendarColors: quickData.calendarColors || {},
              calendars: quickData.calendars || [],
              defaultColor: quickData.defaultColor || null,
            });
            hasLoadedCurrentWeekRef.current = true;
            setLoading(false); // Show current week immediately
          }
        }

        // PHASE 2: Fetch extended range in background
        const timeMin = new Date(currentWeekStart);
        timeMin.setDate(timeMin.getDate() - prefetchWeeks * 7);
        const timeMax = new Date(currentWeekEnd);
        timeMax.setDate(timeMax.getDate() + prefetchWeeks * 7);

        const res = await fetch(
          `/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}${cacheBuster}`,
          { signal: controller.signal, cache: cacheBuster ? "no-store" : "default" }
        );

        if (currentFetchId !== fetchIdRef.current) return;

        if (res.ok) {
          const fetchedData = await res.json();
          // Single batched state update
          setData({
            events: fetchedData.events || [],
            colors: fetchedData.colors || {},
            calendarColors: fetchedData.calendarColors || {},
            calendars: fetchedData.calendars || [],
            defaultColor: fetchedData.defaultColor || null,
          });
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
  // STEP 2: Select calendars - restore from localStorage or use primary
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

    // First load - try to restore from localStorage
    hasSetInitialSelectionRef.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedIds = JSON.parse(saved) as string[];
        // Validate saved IDs against available calendars
        const validSavedIds = savedIds.filter((id) =>
          calendars.some((cal) => cal.id === id)
        );
        if (validSavedIds.length > 0) {
          setSelectedCalendarIds(validSavedIds);
          return;
        }
      }
    } catch {
      // Ignore localStorage errors
    }

    // Fallback: select only the primary calendar
    const primaryCal = calendars.find((c) => c.primary);
    if (primaryCal?.id) {
      setSelectedCalendarIds([primaryCal.id]);
    } else if (calendars[0]?.id) {
      setSelectedCalendarIds([calendars[0].id]);
    }
  }, [calendars]);

  // Save selected calendars to localStorage when they change
  useEffect(() => {
    if (selectedCalendarIds.length > 0 && hasSetInitialSelectionRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCalendarIds));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [selectedCalendarIds]);

  // ============================================
  // STEP 3: Auto-refresh only when tab is visible
  // ============================================
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    let intervalId: NodeJS.Timeout | null = null;

    const doRefresh = () => {
      // Only refresh if visible AND enough time has passed (debounce)
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastRefreshRef.current >= autoRefreshInterval) {
          lastRefreshRef.current = now;
          setLocalRefreshKey((k) => k + 1);
        }
      }
    };

    const startAutoRefresh = () => {
      if (intervalId) return;
      intervalId = setInterval(doRefresh, autoRefreshInterval);
    };

    const stopAutoRefresh = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Refresh on tab return if stale
        doRefresh();
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    };

    // Only start if visible
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

    // Track if we've already shown the delete banner (only show once)
    let hasShownDeleteBanner = false;

    return events
      .filter((event) => {
        // If event has no calendarId, include it (legacy support)
        if (!event.calendarId) return true;
        return selectedCalendarIds.includes(event.calendarId);
      })
      .map((event) => {
        // Check if this event is pending deletion
        const pendingDeletion = pendingDeletions.find(
          (pd: PendingDeletion) => pd.eventId === event.id
        );
        if (pendingDeletion) {
          // Only show the delete banner on the first event
          const showDeleteBanner = !hasShownDeleteBanner;
          if (showDeleteBanner) {
            hasShownDeleteBanner = true;
          }
          return {
            ...event,
            isPendingDeletion: true,
            showDeleteBanner,
            pendingDeletionInfo: pendingDeletion,
          };
        }
        return event;
      });
  }, [events, selectedCalendarIds, pendingDeletions]);

  // Pending events converted to calendar format with recurrence expansion
  const pendingCalendarEvents = useMemo<CalendarEvent[]>(() => {
    if (!pendingEvents || pendingEvents.length === 0) {
      return [];
    }

    const result: CalendarEvent[] = [];
    const seenWeeks = new Set<string>(); // Track which weeks have a confirm banner

    pendingEvents.forEach((pe: PendingEvent) => {
      try {
        // Validate pending event has required fields
        if (!pe.id || !pe.startDateTime || !pe.endDateTime) {
          console.warn("Invalid pending event, missing required fields:", pe);
          return;
        }

        // Expand recurrence into individual instances
        const instances = expandRecurrence({
          startDateTime: pe.startDateTime,
          endDateTime: pe.endDateTime,
          recurrence: pe.recurrence,
          maxInstances: 100, // Reasonable limit
        });

        instances.forEach((instance, idx) => {
          try {
            const instanceDate = new Date(instance.startDateTime);
            if (isNaN(instanceDate.getTime())) {
              console.warn("Invalid instance date:", instance.startDateTime);
              return;
            }

            const weekKey = getWeekKey(instanceDate);

            // Show confirm banner on the first instance of each week
            // This way, if user browses to different weeks, they'll see the confirm option
            const showBanner = !seenWeeks.has(weekKey);
            if (showBanner) {
              seenWeeks.add(weekKey);
            }

            result.push({
              id: `${pe.id}-instance-${idx}`,
              summary: pe.summary,
              start: { dateTime: instance.startDateTime },
              end: { dateTime: instance.endDateTime },
              location: pe.location,
              colorId: pe.colorId,
              isPending: true,
              showConfirmBanner: showBanner,
              pendingGroupId: pe.id, // Links all instances together
            });
          } catch (instanceError) {
            console.error("Error processing instance:", instanceError);
          }
        });
      } catch (error) {
        console.error("Error processing pending event:", error, pe);
        // Still try to add the event even if expansion fails
        result.push({
          id: pe.id,
          summary: pe.summary,
          start: { dateTime: pe.startDateTime },
          end: { dateTime: pe.endDateTime },
          location: pe.location,
          colorId: pe.colorId,
          isPending: true,
          showConfirmBanner: true,
          pendingGroupId: pe.id,
        });
      }
    });

    return result;
  }, [pendingEvents]);

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
