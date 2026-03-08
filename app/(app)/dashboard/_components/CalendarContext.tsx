"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { ThemeSelectionModal } from "./ThemeSelectionModal";
import { OnboardingModal } from "./OnboardingModal";

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
  attendees?: Array<{ email: string; displayName?: string; optional?: boolean }>;
  reminders?: Array<{ minutesBeforeStart: number; method?: string }>;
  colorId?: string;
  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private";
};

export type PendingDeletion = {
  eventId: string;
  calendarId?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  scope?: "this" | "all";
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
  lastConfirmedEvents: Array<{
    id: string;
    summary?: string;
    startDateTime?: string;
    endDateTime?: string;
    calendarId?: string | null;
  }>;
  pendingDeletions: PendingDeletion[];
  setPendingDeletions: (deletions: PendingDeletion[] | ((prev: PendingDeletion[]) => PendingDeletion[])) => void;
  clearPendingDeletions: () => void;
  confirmPendingDeletions: () => Promise<void>;
  isDeleting: boolean;
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
  const [lastConfirmedEvents, setLastConfirmedEvents] = useState<Array<{
    id: string;
    summary?: string;
    startDateTime?: string;
    endDateTime?: string;
    calendarId?: string | null;
  }>>([]);
  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletion[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [goToDateFn, setGoToDateFn] = useState<GoToDateFn | null>(null);
  const [scrollToTime, setScrollToTime] = useState<Date | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  // Fetch theme from database on mount
  useEffect(() => {
    async function fetchTheme() {
      try {
        const res = await fetch("/api/user/theme");
        if (res.ok) {
          const data = await res.json();
          if (data.theme) {
            // User has a theme preference saved
            setThemeState(data.theme);
            localStorage.setItem(THEME_STORAGE_KEY, data.theme);
          } else {
            // No theme saved - check localStorage as fallback, or show modal
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme === "dark" || savedTheme === "light") {
              setThemeState(savedTheme);
              // Save to database
              await fetch("/api/user/theme", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: savedTheme }),
              });
            } else {
              // Show theme selection modal for first-time users
              setShowThemeModal(true);
            }
          }
        } else {
          // Fallback to localStorage if API fails
          const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
          if (savedTheme === "dark" || savedTheme === "light") {
            setThemeState(savedTheme);
          }
        }
      } catch {
        // Fallback to localStorage if API fails
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === "dark" || savedTheme === "light") {
          setThemeState(savedTheme);
        }
      } finally {
        setIsLoadingTheme(false);
      }
    }

    fetchTheme();
  }, []);

  // Check if onboarding is needed
  const checkOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/user/preferences");
      if (res.ok) {
        const data = await res.json();
        const prefs = data.preferences || [];
        const hasOnboarding = prefs.some((p: { key: string }) => p.key === "onboarding_completed");
        if (!hasOnboarding) {
          setShowOnboarding(true);
        }
      }
    } catch {
      // Ignore - don't block user
    }
  }, []);

  // Handle theme selection from modal
  const handleThemeSelect = useCallback(async (selectedTheme: "light" | "dark") => {
    setThemeState(selectedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    setShowThemeModal(false);

    // Save to database
    try {
      await fetch("/api/user/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: selectedTheme }),
      });
    } catch {
      // Ignore errors - localStorage will serve as fallback
    }

    // Check if onboarding needed after theme selection
    checkOnboarding();
  }, [checkOnboarding]);

  // Also check onboarding on mount for returning users who have a theme but no onboarding
  useEffect(() => {
    if (!isLoadingTheme && !showThemeModal) {
      checkOnboarding();
    }
  }, [isLoadingTheme, showThemeModal, checkOnboarding]);

  // Sync timezone on mount: prefer stored value (set from Google Calendar on login),
  // fall back to browser detection if nothing is stored yet.
  useEffect(() => {
    const syncTimezone = async () => {
      try {
        const res = await fetch("/api/user/timezone");
        if (res.ok) {
          const data = await res.json();
          if (!data.timezone) {
            // No timezone stored (e.g. legacy user before Google Calendar sync) — save browser-detected one
            const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (detected) {
              await fetch("/api/user/timezone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ timezone: detected }),
              });
            }
          }
        }
      } catch {
        // Ignore
      }
    };
    syncTimezone();
  }, []);

  // Wrapper to save theme to both localStorage and database when it changes
  const setTheme = useCallback(async (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
    // Save to database
    try {
      await fetch("/api/user/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });
    } catch {
      // Ignore errors
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

      const data = await res.json();
      if (Array.isArray(data?.events)) {
        const recent = data.events
          .flatMap((evt: unknown) => {
            if (
              typeof evt === "object" &&
              evt !== null &&
              "id" in evt &&
              typeof (evt as { id: unknown }).id === "string"
            ) {
              const e = evt as {
                id: string;
                summary?: string;
                start?: { dateTime?: string };
                end?: { dateTime?: string };
                calendarId?: string | null;
                organizer?: { email?: string };
              };
              return [
                {
                  id: e.id,
                  summary: e.summary,
                  startDateTime: e.start?.dateTime,
                  endDateTime: e.end?.dateTime,
                  calendarId: e.calendarId ?? e.organizer?.email ?? null,
                },
              ];
            }
            return [];
          });
        if (recent.length > 0) {
          setLastConfirmedEvents(recent);
        }
      }

      setPendingEvents([]);
      triggerRefresh();
    } finally {
      setIsConfirming(false);
    }
  }, [pendingEvents, triggerRefresh]);

  const clearPendingDeletions = useCallback(() => {
    setPendingDeletions([]);
  }, []);

  const confirmPendingDeletions = useCallback(async () => {
    if (pendingDeletions.length === 0) return;

    setIsDeleting(true);
    try {
      // Delete each event
      for (const deletion of pendingDeletions) {
        const query = deletion.calendarId ? `?calendarId=${deletion.calendarId}` : "";
        await fetch(`/api/calendar/events/${deletion.eventId}${query}`, {
          method: "DELETE",
        });
      }

      setPendingDeletions([]);
      triggerRefresh();
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDeletions, triggerRefresh]);

  // Don't render children until we've determined the theme
  if (isLoadingTheme) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

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
        lastConfirmedEvents,
        pendingDeletions,
        setPendingDeletions,
        clearPendingDeletions,
        confirmPendingDeletions,
        isDeleting,
        goToDate: goToDateFn,
        setGoToDate,
        scrollToTime,
        setScrollToTime,
      }}
    >
      {showThemeModal && <ThemeSelectionModal onSelect={handleThemeSelect} />}
      {showOnboarding && !showThemeModal && (
        <OnboardingModal isDark={theme === "dark"} onComplete={() => setShowOnboarding(false)} />
      )}
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
