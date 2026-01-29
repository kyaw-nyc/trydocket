"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useCalendar, PendingEvent } from "./CalendarContext";
import EventDetailsModal from "./EventDetailsModal";

type CalendarEvent = {
  id: string;
  summary?: string;
  colorId?: string;
  recurringEventId?: string;
  calendarId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  isPending?: boolean;
};

type ColorDef = {
  background: string;
  foreground: string;
};

type ColorsMap = Record<string, ColorDef>;

type UserCalendar = {
  id: string;
  summary?: string;
  primary?: boolean;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  colorId?: string | null;
};

const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const STORAGE_KEY = "docket:selectedCalendars";

const DEFAULT_COLOR: ColorDef = {
  background: "#039be5",
  foreground: "#ffffff",
};

const PENDING_COLOR: ColorDef = {
  background: "#6366f1",
  foreground: "#ffffff",
};

const MS_IN_DAY = 1000 * 60 * 60 * 24;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getWeekDates(baseDate: Date): Date[] {
  const start = startOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthMatrix(date: Date): Date[] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatDateHeader(date: Date): { day: string; date: number } {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return { day: days[date.getDay()], date: date.getDate() };
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function getEventPosition(event: CalendarEvent | { start: { dateTime: string }; end: { dateTime: string } }): { top: number; height: number } | null {
  const startDateTime = "start" in event && event.start && "dateTime" in event.start ? event.start.dateTime : null;
  if (!startDateTime) return null;

  const start = new Date(startDateTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const top = (startMinutes / 60) * HOUR_HEIGHT;

  let durationMinutes = 60;
  const endDateTime = "end" in event && event.end && "dateTime" in event.end ? event.end.dateTime : null;
  if (endDateTime) {
    const end = new Date(endDateTime);
    durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  }

  // Minimum height to avoid text clipping (title + time + optional location)
  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 56);
  return { top, height };
}

type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
  startMs: number;
  endMs: number;
  col: number;
  cols: number;
  leftPercent: number;
  widthPercent: number;
};

function getEventTimes(event: CalendarEvent): { start: Date; end: Date } | null {
  const startString = event.start?.dateTime || event.start?.date;
  const endString = event.end?.dateTime || event.end?.date;
  if (!startString) return null;
  const start = new Date(startString);
  const end = endString ? new Date(endString) : new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

// Lay out overlapping events into columns (Google Calendar style)
function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const enriched: PositionedEvent[] = [];

  events.forEach((event) => {
    const times = getEventTimes(event);
    const pos = getEventPosition(event);
    if (!times || !pos) return;
    enriched.push({
      event,
      top: pos.top,
      height: pos.height,
      startMs: times.start.getTime(),
      endMs: times.end.getTime(),
      col: 0,
      cols: 1,
      leftPercent: 0,
      widthPercent: 100,
    });
  });

  // Sort by start then duration
  enriched.sort((a, b) => (a.startMs === b.startMs ? a.endMs - b.endMs : a.startMs - b.startMs));

  const positioned: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const withCols: PositionedEvent[] = [];

    cluster.forEach((item) => {
      let col = columnEnds.findIndex((end) => end <= item.startMs);
      if (col === -1) {
        columnEnds.push(item.endMs);
        col = columnEnds.length - 1;
      } else {
        columnEnds[col] = item.endMs;
      }
      withCols.push({ ...item, col });
    });

    const cols = columnEnds.length || 1;
    const gap = 0; // no gap to mimic Google Calendar flush columns
    const width = 100 / cols;

    withCols.forEach((item) => {
      const left = item.col * (width + gap);
      positioned.push({
        ...item,
        cols,
        leftPercent: left,
        widthPercent: width,
      });
    });

    cluster = [];
    clusterEnd = -Infinity;
  };

  enriched.forEach((item) => {
    if (item.startMs >= clusterEnd) {
      flushCluster();
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMs);
  });
  flushCluster();

  return positioned;
}

function formatEventTimeRange(startString?: string, endString?: string): string {
  if (!startString) return "";
  const start = new Date(startString);
  const formatter = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" });
  const startTime = formatter.format(start);
  if (!endString) return startTime;
  const endTime = formatter.format(new Date(endString));
  return `${startTime} – ${endTime}`;
}

function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function getCurrentTimePosition(): number {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes / 60) * HOUR_HEIGHT;
}

function getTimeZoneAbbr(): string {
  const tz = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return tz || "";
}

function weekRangeLabel(weekDates: Date[]): string {
  if (weekDates.length === 0) return "";
  const start = weekDates[0];
  const end = weekDates[weekDates.length - 1];
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${start.toLocaleString([], { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleString([], { month: "short" })} ${start.getDate()} – ${end.toLocaleString([], { month: "short" })} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${start.toLocaleString([], { month: "short" })} ${start.getDate()}, ${start.getFullYear()} – ${end.toLocaleString([], { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
}

export default function CalendarPanel() {
  const {
    refreshKey,
    triggerRefresh,
    theme,
    setTheme,
    pendingEvents,
    clearPendingEvents,
    confirmPendingEvents,
    isConfirming,
  } = useCalendar();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [colors, setColors] = useState<ColorsMap>({});
  const [calendarColors, setCalendarColors] = useState<ColorsMap>({});
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [hasLoadedSelection, setHasLoadedSelection] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [defaultColor, setDefaultColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [currentTimePos, setCurrentTimePos] = useState(getCurrentTimePosition());
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<{ id: string; calendarId?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const eventsCache = useRef<Map<string, CalendarEvent[]>>(new Map());

  const isDark = theme === "dark";

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const monthMatrix = useMemo(() => getMonthMatrix(baseDate), [baseDate]);
  const timezoneAbbr = useMemo(() => getTimeZoneAbbr(), []);
  const todayIndex = weekDates.findIndex((d) => isToday(d));

  const weekLabel = useMemo(() => weekRangeLabel(weekDates), [weekDates]);

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

  const calendarLegend = useMemo(() => {
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hasLoadedSelection) return;
    if (calendars.length > 0 && selectedCalendarIds.length === 0) {
      setEvents([]);
      return;
    }

    async function fetchEvents() {
      if (!weekDates.length) return;
      const timeMin = new Date(weekDates[0]);
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date(weekDates[6]);
      timeMax.setHours(23, 59, 59, 999);

      const cacheKey = `${timeMin.toISOString()}|${timeMax.toISOString()}|${selectedCalendarIds.join(",")}|${refreshKey}`;
      const cached = eventsCache.current.get(cacheKey);
      if (cached) {
        setEvents(cached);
        return;
      }

      setLoading(true);

      // abort previous fetch if still running
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
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setColors(data.colors || {});
          setCalendarColors(data.calendarColors || {});
          setCalendars(data.calendars || []);
          setDefaultColor(data.defaultColor || null);
          eventsCache.current.set(cacheKey, data.events || []);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to fetch events:", error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    fetchEvents();
  }, [weekDates, localRefreshKey, refreshKey, selectedCalendarIds, hasLoadedSelection, calendars.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  const handleRefresh = () => setLocalRefreshKey((k) => k + 1);

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return allEvents.filter((event) => {
      const eventStart = event.start?.dateTime || event.start?.date;
      if (!eventStart) return false;
      const eventDate = new Date(eventStart);
      return isSameDay(eventDate, date);
    });
  };

  const goToDate = (date: Date) => {
    const todayStart = startOfWeek(new Date());
    const targetStart = startOfWeek(date);
    const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / MS_IN_DAY);
    setWeekOffset(diffDays / 7);
  };

  const goToMonth = (delta: number) => {
    const next = new Date(baseDate);
    next.setMonth(baseDate.getMonth() + delta);
    goToDate(next);
  };

  const toggleCalendar = (id: string) => {
    updateSelection((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((c) => c !== id) : [...prev, id];
      return next;
    });
  };

  const getEventColor = (event: CalendarEvent): ColorDef => {
    if (event.isPending) {
      return PENDING_COLOR;
    }
    if (event.colorId && colors[event.colorId]) {
      return colors[event.colorId];
    }
    if (defaultColor) {
      return { background: defaultColor, foreground: getContrastColor(defaultColor) };
    }
    return DEFAULT_COLOR;
  };

  return (
    <div className={`flex h-full w-full ${isDark ? "bg-[#0f1012]" : "bg-white"}`}>
      {/* Sidebar (overlay) */}
      <aside
        className={`fixed left-0 top-14 z-40 hidden h-[calc(100%-56px)] w-60 transform transition-transform duration-200 md:block ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        } ${isDark ? "bg-[#16171a]" : "bg-white"}`}
      >
        <div className="px-4 py-3" />

        <div className="mt-3 px-3">
          <div className="rounded-2xl p-2">
            <div className="flex items-center justify-between">
              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {baseDate.toLocaleString([], { month: "long", year: "numeric" })}
              </p>
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => goToMonth(-1)}
                   className={`cursor-pointer rounded-full p-1 transition-colors ${
                     isDark ? "text-[#e8eaed] hover:bg-[#111111]" : "text-gray-700 hover:bg-[#f3f3f3]"
                   }`}
                   aria-label="Previous month"
                 >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => goToMonth(1)}
                   className={`cursor-pointer rounded-full p-1 transition-colors ${
                     isDark ? "text-[#e8eaed] hover:bg-[#111111]" : "text-gray-700 hover:bg-[#f3f3f3]"
                   }`}
                  aria-label="Next month"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={`mt-2 grid grid-cols-7 text-[10px] ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
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
                    onClick={() => goToDate(date)}
                    className={`flex h-8 items-center justify-center rounded-md text-xs transition ${
                      today
                        ? isDark
                          ? "bg-white text-black shadow"
                          : "bg-black text-white shadow"
                        : inWeek
                          ? isDark
                            ? "bg-white/10 text-white"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "text-[#9aa0a6] hover:bg-white/5"
                            : "text-gray-600 hover:bg-white"
                    } ${inCurrentMonth ? "" : "opacity-50"}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          <div className="rounded-2xl p-3">
            <p className={`text-xs font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>My calendars</p>
            <div className="mt-2 space-y-1.5">
              {calendarLegend.map((entry) => {
                const checked = selectedCalendarIds.includes(entry.id);
                const isPreview = entry.id === "preview";
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={isPreview}
                    onClick={() => !isPreview && toggleCalendar(entry.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition ${
                      isDark ? "hover:bg-[#26272b]" : "hover:bg-gray-50"
                    } ${isPreview ? "cursor-default opacity-80" : ""}`}
                  >
                    <span
                      className="flex h-3.5 w-3.5 items-center justify-center rounded-[6px] border-0"
                      style={{
                        backgroundColor: checked ? entry.swatch : `${entry.swatch}1A`,
                      }}
                    >
                      {checked && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-xs ${isDark ? "text-[#e8eaed]" : "text-gray-800"}`}>
                      {entry.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time zone card removed per request */}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className={`flex items-center justify-between border-b px-4 py-3 md:px-6 ${
            isDark ? "border-[#2c2d31] bg-[#111214]" : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className={`rounded-full p-2 transition ${
                isDark ? "text-[#e8eaed] hover:bg-[#1c1d20]" : "text-gray-700 hover:bg-gray-100"
              }`}
              aria-label="Toggle sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={() => setWeekOffset(0)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? "border-white bg-black text-white hover:bg-[#111111]"
                    : "border-black bg-white text-black hover:bg-[#f3f3f3]"
                }`}
          >
            Today
          </button>
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className={`rounded-full p-2 transition ${
                  isDark ? "text-[#e8eaed] hover:bg-[#1c1d20]" : "text-gray-700 hover:bg-gray-100"
                }`}
                aria-label="Previous week"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
                className={`rounded-full p-2 transition ${
                  isDark ? "text-[#e8eaed] hover:bg-[#1c1d20]" : "text-gray-700 hover:bg-gray-100"
                }`}
                aria-label="Next week"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
            </div>

            <div className="ml-1 flex flex-col leading-tight">
              <span className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {weekLabel || baseDate.toLocaleDateString([], { month: "long", year: "numeric" })}
              </span>
              <span className={`text-xs ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                Week view
          </span>
            </div>
        </div>

          <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
              className={`rounded-full p-2 transition disabled:opacity-50 ${
                isDark ? "text-[#e8eaed] hover:bg-[#1c1d20]" : "text-gray-700 hover:bg-gray-100"
              }`}
            title="Refresh"
          >
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
                className={`rounded-full p-2 transition ${
                  isDark ? "text-[#e8eaed] hover:bg-[#1c1d20]" : "text-gray-700 hover:bg-gray-100"
                }`}
              title="Settings"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
                <div
                  className={`absolute right-0 top-full mt-2 w-44 rounded-xl border py-1 shadow-xl z-50 ${
                    isDark ? "border-[#2c2d31] bg-[#1c1d20]" : "border-gray-200 bg-white"
                  }`}
                >
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition ${
                      isDark ? "text-[#e8eaed] hover:bg-[#26272b]" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  {isDark ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {isDark ? "Light mode" : "Dark mode"}
                </button>
                  <div className={`my-1 border-t ${isDark ? "border-[#2c2d31]" : "border-gray-200"}`} />
                <button
                  onClick={() => signOut({ callbackUrl: "/landing" })}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition ${
                      isDark ? "text-[#e8eaed] hover:bg-[#26272b]" : "text-gray-700 hover:bg-gray-100"
                    }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <div
          className={`flex flex-1 min-h-0 flex-col transition-all duration-200 ${
            sidebarOpen ? "md:pl-60" : "md:pl-0"
          }`}
        >
          {pendingEvents.length > 0 && (
            <div
              className={`mx-4 mt-3 flex items-center justify-between rounded-xl border px-4 py-3 md:mx-6 ${
                isDark ? "border-[#2c2d31] bg-[#1c1d20]" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? "bg-indigo-500/20" : "bg-indigo-50"}`}>
                  <svg className={`h-4 w-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} ready to add
                  </p>
                  <p className={`text-xs ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                    Review the highlighted previews on your calendar
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearPendingEvents}
                  disabled={isConfirming}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    isDark ? "text-[#9aa0a6] hover:text-white hover:bg-[#26272b]" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Dismiss
                </button>
                <button
                  onClick={confirmPendingEvents}
                  disabled={isConfirming}
                  className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                    isDark
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      Add to Calendar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Day headers */}
          <div className={`mt-3 flex border-b px-4 md:px-6 ${isDark ? "border-[#2c2d31]" : "border-gray-200"}`}>
            <div className="w-14 flex-shrink-0 pr-2">
              <span className={`text-[11px] font-semibold tracking-wide ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                {timezoneAbbr}
              </span>
            </div>
            {weekDates.map((date) => {
              const { day, date: dateNum } = formatDateHeader(date);
              const today = isToday(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`flex flex-1 flex-col items-center pb-3 text-center ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}
                >
                  <span className="text-[11px] font-semibold tracking-wide">{day}</span>
                  <span
                    className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold border ${
                      today
                        ? isDark
                          ? "border-white text-white"
                          : "border-black text-gray-900"
                        : "border-transparent " + (isDark ? "text-[#e8eaed]" : "text-gray-900")
                    }`}
                  >
                    {dateNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 pb-8 md:px-6">
            <div className="relative flex" style={{ height: HOUR_HEIGHT * 24 }}>
              {/* Hour labels on the left, aligned above lines */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-14">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className={`absolute right-1 text-[11px] font-semibold ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}
                    style={{ top: hour * HOUR_HEIGHT - 10 }}
                  >
                    {hour > 0 && formatHour(hour)}
                  </div>
                ))}
              </div>

              {/* Grid columns */}
              <div className="relative flex flex-1 pl-14">
                {weekDates.map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(date);
                  const laidOut = layoutDayEvents(dayEvents);
                  const today = isToday(date);

                  return (
                    <div
                      key={date.toISOString()}
                      className={`relative flex-1 border-l ${isDark ? "border-[#2c2d31]" : "border-gray-200"}`}
                    >
                      {/* hour lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className={`absolute w-full border-t ${isDark ? "border-[#1f2024]" : "border-gray-100"}`}
                          style={{ top: hour * HOUR_HEIGHT }}
                        />
                      ))}

                      {/* today shading */}
                      {today && <div className="absolute inset-0 -z-10 bg-blue-500/5" />}

                      {/* current time line */}
                      {today && todayIndex === dayIndex && (
                        <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: currentTimePos }}>
                          <div className="h-3 w-3 -ml-1.5 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(255,59,48,0.25)]" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      )}

                      {laidOut.map((item) => {
                        const { event, top, height, leftPercent, widthPercent } = item;
                        const color = getEventColor(event);
                        const textColor = getContrastColor(color.background);
                        const hoverColor = darkenColor(color.background, 12);
                        const timeColor = textColor === "#ffffff" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";
                        const locationColor = textColor === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

                        return (
                          <div
                            key={event.id}
                            onClick={() => {
                              if (event.isPending) return;
                              setSelectedEventDetail({ id: event.id, calendarId: event.calendarId });
                            }}
                            className={`absolute overflow-hidden rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                              event.isPending ? "cursor-default ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-transparent" : "cursor-pointer"
                            }`}
                            style={{
                              top,
                              height,
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              backgroundColor: color.background,
                              color: textColor,
                              border: isDark
                                ? "1px solid rgba(0,0,0,0.35)" // subtle black border on dark theme
                                : "1px solid rgba(255,255,255,0.65)", // light border on light theme
                            }}
                            onMouseEnter={(e) => !event.isPending && (e.currentTarget.style.backgroundColor = hoverColor)}
                            onMouseLeave={(e) => !event.isPending && (e.currentTarget.style.backgroundColor = color.background)}
                          >
                            <div className="flex items-center gap-2">
                              {event.isPending && (
                                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                                  New
                                </span>
                              )}
                              <p className="flex-1 truncate text-[13px] font-semibold leading-tight">
                                {event.summary || "Untitled"}
                              </p>
                            </div>
                            {height > 26 && event.start?.dateTime && (
                              <p className="mt-0.5 truncate text-[11px] font-medium" style={{ color: timeColor }}>
                                {formatEventTimeRange(event.start.dateTime, event.end?.dateTime)}
                              </p>
                            )}
                            {height > 40 && event.location && (
                              <p className="truncate text-[11px]" style={{ color: locationColor }}>
                                {event.location}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {selectedEventDetail && (
          <EventDetailsModal
            eventId={selectedEventDetail.id}
            calendarId={selectedEventDetail.calendarId}
            onClose={() => setSelectedEventDetail(null)}
            onUpdated={triggerRefresh}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
