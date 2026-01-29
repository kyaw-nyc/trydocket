"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useCalendar } from "./CalendarContext";
import EventModal from "./EventModal";

type CalendarEvent = {
  id: string;
  summary?: string;
  colorId?: string;
  recurringEventId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type ColorDef = {
  background: string;
  foreground: string;
};

type ColorsMap = Record<string, ColorDef>;

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DEFAULT_COLOR: ColorDef = {
  background: "#039be5",
  foreground: "#ffffff",
};

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatDateHeader(date: Date): { day: string; date: number } {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function getEventPosition(event: CalendarEvent): { top: number; height: number } | null {
  if (!event.start?.dateTime) return null;

  const start = new Date(event.start.dateTime);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const top = (startMinutes / 60) * HOUR_HEIGHT;

  let durationMinutes = 60;
  if (event.end?.dateTime) {
    const end = new Date(event.end.dateTime);
    durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  }

  const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getContrastColor(bgColor: string): string {
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
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

export default function CalendarPanel() {
  const { refreshKey, triggerRefresh, theme, setTheme } = useCalendar();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [colors, setColors] = useState<ColorsMap>({});
  const [defaultColor, setDefaultColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [currentTimePos, setCurrentTimePos] = useState(getCurrentTimePosition());
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  const getEventColor = (event: CalendarEvent): ColorDef => {
    if (event.colorId && colors[event.colorId]) {
      return colors[event.colorId];
    }
    if (defaultColor) {
      return { background: defaultColor, foreground: getContrastColor(defaultColor) };
    }
    return DEFAULT_COLOR;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePos(getCurrentTimePosition());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const base = new Date();
      base.setDate(base.getDate() + weekOffset * 7);
      const dates = getWeekDates(base);

      const timeMin = new Date(dates[0]);
      timeMin.setHours(0, 0, 0, 0);
      const timeMax = new Date(dates[6]);
      timeMax.setHours(23, 59, 59, 999);

      try {
        const res = await fetch(
          `/api/calendar/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setColors(data.colors || {});
          setDefaultColor(data.defaultColor || null);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, [weekOffset, localRefreshKey, refreshKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  const handleRefresh = () => setLocalRefreshKey((k) => k + 1);

  const handleSaveEvent = async (eventId: string, updates: { summary?: string; colorId?: string }) => {
    const res = await fetch("/api/calendar/events/" + eventId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update event");
    triggerRefresh();
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await fetch("/api/calendar/events/" + eventId, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete event");
    triggerRefresh();
  };

  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((event) => {
      const eventStart = event.start?.dateTime || event.start?.date;
      if (!eventStart) return false;
      const eventDate = new Date(eventStart);
      return isSameDay(eventDate, date);
    });
  };

  const monthYear = baseDate.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const todayIndex = weekDates.findIndex((d) => isToday(d));

  return (
    <div className={`flex h-full flex-col ${isDark ? "bg-[#202124]" : "bg-white"}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b px-4 py-2 ${isDark ? "border-[#3c4043]" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className={`rounded p-1 ${isDark ? "text-[#9aa0a6] hover:bg-[#3c4043]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`rounded px-2 py-1 text-xs font-medium ${isDark ? "text-[#e8eaed] hover:bg-[#3c4043]" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className={`rounded p-1 ${isDark ? "text-[#9aa0a6] hover:bg-[#3c4043]" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className={`ml-2 text-sm font-medium ${isDark ? "text-[#e8eaed]" : "text-gray-700"}`}>
            {monthYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`rounded p-1.5 disabled:opacity-50 ${isDark ? "text-[#9aa0a6] hover:bg-[#3c4043]" : "text-gray-500 hover:bg-gray-100"}`}
            title="Refresh"
          >
            <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`rounded p-1.5 ${isDark ? "text-[#9aa0a6] hover:bg-[#3c4043]" : "text-gray-500 hover:bg-gray-100"}`}
              title="Settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
              <div className={`absolute right-0 top-full mt-1 w-44 rounded-lg border py-1 shadow-lg z-50 ${isDark ? "border-[#3c4043] bg-[#2d2e30]" : "border-gray-200 bg-white"}`}>
                <button
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${isDark ? "text-[#e8eaed] hover:bg-[#3c4043]" : "text-gray-700 hover:bg-gray-100"}`}
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
                <div className={`my-1 border-t ${isDark ? "border-[#3c4043]" : "border-gray-200"}`} />
                <button
                  onClick={() => signOut({ callbackUrl: "/landing" })}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${isDark ? "text-[#e8eaed] hover:bg-[#3c4043]" : "text-gray-700 hover:bg-gray-100"}`}
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
      </div>

      {/* Day headers */}
      <div className={`flex border-b ${isDark ? "border-[#3c4043]" : "border-gray-200"}`}>
        <div className="w-16 flex-shrink-0" />
        {weekDates.map((date) => {
          const { day, date: dateNum } = formatDateHeader(date);
          const today = isToday(date);
          return (
            <div
              key={date.toISOString()}
              className={`flex-1 flex flex-col items-center py-2 border-l ${isDark ? "border-[#3c4043]" : "border-gray-200"}`}
            >
              <span className={`text-xs ${today ? (isDark ? "text-white" : "text-black") : isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                {day}
              </span>
              <span className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${today ? (isDark ? "bg-white text-black" : "bg-black text-white") : isDark ? "text-[#e8eaed]" : "text-gray-900"}`}>
                {dateNum}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${isDark ? "bg-[#202124]" : "bg-white"}`}>
        <div className="flex relative" style={{ height: HOUR_HEIGHT * 24 }}>
          <div className="w-16 flex-shrink-0 relative">
            {HOURS.map((hour) => (
              <div key={hour} className={`absolute right-2 text-xs ${isDark ? "text-white" : "text-black"}`} style={{ top: hour * HOUR_HEIGHT - 6 }}>
                {hour > 0 && formatHour(hour)}
              </div>
            ))}
          </div>

          {weekDates.map((date, dayIndex) => {
            const dayEvents = getEventsForDay(date);
            const today = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className={`flex-1 relative border-l ${isDark ? "border-[#3c4043]" : "border-gray-200"}`}
              >
                {HOURS.map((hour) => (
                  <div key={hour} className={`absolute w-full border-t ${isDark ? "border-[#3c4043]" : "border-gray-100"}`} style={{ top: hour * HOUR_HEIGHT }} />
                ))}

                {today && todayIndex === dayIndex && (
                  <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: currentTimePos }}>
                    <div className="h-3 w-3 -ml-1.5 rounded-full bg-red-500" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                  </div>
                )}

                {dayEvents.map((event) => {
                  const pos = getEventPosition(event);
                  if (!pos) return null;

                  const color = getEventColor(event);
                  const textColor = getContrastColor(color.background);
                  const hoverColor = darkenColor(color.background, 15);
                  const timeColor = textColor === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-xs overflow-hidden z-10 cursor-pointer transition-colors"
                      style={{
                        top: pos.top,
                        height: pos.height,
                        backgroundColor: color.background,
                        color: textColor,
                        // @ts-expect-error CSS custom property
                        "--hover-bg": hoverColor,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverColor)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color.background)}
                    >
                      <p className="font-medium truncate">{event.summary || "Untitled"}</p>
                      {pos.height > 30 && event.start?.dateTime && (
                        <p className="truncate" style={{ color: timeColor }}>
                          {formatEventTime(event.start.dateTime)}
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

      {/* Event edit modal */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          theme={theme}
        />
      )}
    </div>
  );
}
