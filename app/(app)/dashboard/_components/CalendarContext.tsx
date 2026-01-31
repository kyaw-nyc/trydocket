"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const THEME_STORAGE_KEY = "docket:theme";

export type PendingEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  recurrence?: string[];
  calendarId?: string;
};

type GoToDateFn = (date: Date) => void;

type CalendarContextType = {
  refreshKey: number;
  triggerRefresh: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  pendingEvents: PendingEvent[];
  setPendingEvents: (events: PendingEvent[] | ((prev: PendingEvent[]) => PendingEvent[])) => void;
  addPendingEvent: (event: PendingEvent) => void;
  clearPendingEvents: () => void;
  confirmPendingEvents: () => Promise<void>;
  isConfirming: boolean;
  goToDate: GoToDateFn | null;
  setGoToDate: (fn: GoToDateFn) => void;
  scrollToTime: Date | null;
  setScrollToTime: (time: Date | null) => void;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [goToDateFn, setGoToDateFn] = useState<GoToDateFn | null>(null);
  const [scrollToTime, setScrollToTime] = useState<Date | null>(null);

  // Restore theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") {
        setThemeState(savedTheme);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Wrapper to save theme to localStorage when it changes
  const setTheme = useCallback((newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const setGoToDate = useCallback((fn: GoToDateFn) => {
    setGoToDateFn(() => fn);
  }, []);

  const addPendingEvent = useCallback((event: PendingEvent) => {
    setPendingEvents((prev) => [...prev, event]);
  }, []);

  const clearPendingEvents = useCallback(() => {
    setPendingEvents([]);
  }, []);

  const confirmPendingEvents = useCallback(async () => {
    if (pendingEvents.length === 0) return;
    
    setIsConfirming(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: pendingEvents }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to create events");
      }
      
      setPendingEvents([]);
      triggerRefresh();
    } finally {
      setIsConfirming(false);
    }
  }, [pendingEvents, triggerRefresh]);

  return (
    <CalendarContext.Provider
      value={{
        refreshKey,
        triggerRefresh,
        theme,
        setTheme,
        pendingEvents,
        setPendingEvents,
        addPendingEvent,
        clearPendingEvents,
        confirmPendingEvents,
        isConfirming,
        goToDate: goToDateFn,
        setGoToDate,
        scrollToTime,
        setScrollToTime,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within CalendarProvider");
  }
  return context;
}
