"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type PendingEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  recurrence?: string[];
};

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
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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
