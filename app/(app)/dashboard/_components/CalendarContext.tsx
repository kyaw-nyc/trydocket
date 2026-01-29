"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type CalendarContextType = {
  refreshKey: number;
  triggerRefresh: () => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

const CalendarContext = createContext<CalendarContextType | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <CalendarContext.Provider value={{ refreshKey, triggerRefresh, theme, setTheme }}>
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
