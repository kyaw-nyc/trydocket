"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useCalendar, PendingEvent, PendingDeletion } from "./CalendarContext";
import { cn } from "@/lib/utils";
import { UserCalendar } from "./types/calendar";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatPopupProps = {
  sidebarOpen?: boolean;
  isMobile?: boolean;
  calendars?: UserCalendar[];
  selectedCalendarIds?: string[];
  onEnableCalendar?: (calendarId: string) => void;
};

const CANCEL_INTENT_REGEX = /\b(stop|cancel|never mind|nevermind|nvm|abort|don't add|dont add|do not add|don't delete|dont delete|do not delete|forget it|keep it|keep that|leave it)\b/i;

// Limit messages sent to AI to save API tokens (full history is still saved to DB)
const MAX_CONTEXT_MESSAGES = 20;

export default function ChatPopup({ sidebarOpen = false, isMobile = false, calendars = [], selectedCalendarIds, onEnableCalendar }: ChatPopupProps) {
  const { triggerRefresh, theme, pendingEvents, pendingDeletions, lastConfirmedEvents, setPendingEvents, clearPendingEvents, clearPendingDeletions, setPendingDeletions, goToDate, setScrollToTime } = useCalendar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [slot, setSlot] = useState<"left" | "center" | "right">("center");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1280);
  const [popupWidth, setPopupWidth] = useState<number>(640);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; slotAtStart: "left" | "center" | "right"; dragging: boolean }>({
    startX: 0,
    slotAtStart: "center",
    dragging: false,
  });

  const isDark = theme === "dark";

  // Load session ID on mount (but don't load message history)
  useEffect(() => {
    async function loadSessionId() {
      try {
        const res = await fetch("/api/chat/history");
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
        }
      } catch (error) {
        console.error("Failed to load session ID:", error);
      }
    }
    loadSessionId();
  }, []);

  // Save messages to database
  const saveMessages = useCallback(async (newMessages: Message[]) => {
    if (newMessages.length === 0) return;

    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: newMessages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }
      }
    } catch (error) {
      console.error("Failed to save chat history:", error);
    }
  }, [sessionId]);

  // Clear chat history
  const clearHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/history", { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        setSessionId(null);
        setIsExpanded(true);
      }
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Track viewport width to clamp horizontal travel
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Measure popup width for accurate boundary clamping
  useEffect(() => {
    if (!popupRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) setPopupWidth(width);
      }
    });
    observer.observe(popupRef.current);
    return () => observer.disconnect();
  }, []);

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Los_Angeles";
    }
  };

  // Manage draggable snap slots (left, center, right) while avoiding the sidebar
  const allowedSlots = useMemo<("left" | "center" | "right")[]>(() => {
    if (isMobile) return ["center"];
    return ["left", "center", "right"]; // allow left even when sidebar is open; clamping handles overlap
  }, [isMobile]);

  useEffect(() => {
    if (!allowedSlots.includes(slot)) {
      setSlot(allowedSlots[0] ?? "center");
    }
  }, [allowedSlots, slot]);

  const baseCenterShift = !isMobile && sidebarOpen ? 128 : 0;

  const edgePadding = 14; // slightly larger gap from viewport edges
  const rightLimit = useMemo(() => {
    const halfViewport = viewportWidth / 2;
    const halfPopup = popupWidth / 2;
    return Math.max(0, halfViewport - halfPopup - edgePadding);
  }, [viewportWidth, popupWidth, edgePadding]);

  const leftLimit = useMemo(() => {
    const halfViewport = viewportWidth / 2;
    const halfPopup = popupWidth / 2;
    // When sidebar is open, shift the left wall right by baseCenterShift and keep edge padding
    return -Math.max(0, halfViewport - halfPopup - edgePadding) + baseCenterShift + edgePadding;
  }, [viewportWidth, popupWidth, baseCenterShift, edgePadding]);

  const slotOffsets = useMemo<Record<"left" | "center" | "right", number>>(
    () => ({
      left: leftLimit,
      center: 0,
      right: rightLimit,
    }),
    [leftLimit, rightLimit]
  );

  const clampBounds = useMemo(
    () => ({
      min: leftLimit,
      max: rightLimit,
    }),
    [leftLimit, rightLimit]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // If the user asks to stop/cancel while previews are showing, clear them immediately without waiting for the model
      const wantsToCancelPreview = CANCEL_INTENT_REGEX.test(text);
      if (wantsToCancelPreview && (pendingEvents.length > 0 || pendingDeletions.length > 0)) {
        clearPendingEvents();
        clearPendingDeletions();

        const cleared: string[] = [];
        if (pendingEvents.length > 0) {
          cleared.push(`${pendingEvents.length} pending event${pendingEvents.length > 1 ? "s" : ""}`);
        }
        if (pendingDeletions.length > 0) {
          cleared.push(`${pendingDeletions.length} pending deletion${pendingDeletions.length > 1 ? "s" : ""}`);
        }

        const summary = cleared.length > 0 ? cleared.join(" and ") : "pending changes";
        const assistantMessage: Message = { role: "assistant", content: `No problem—cleared ${summary}. Nothing will be added or deleted.` };
        setMessages((prev) => [...prev, assistantMessage]);
        // Save both messages to history
        saveMessages([userMessage, assistantMessage]);
        setLoading(false);
        return;
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      // Transform calendars to the format the API expects
      const calendarInfo = calendars
        .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer')
        .map(c => ({
          id: c.id,
          name: c.summary || c.id,
          isPrimary: c.primary || false,
        }));

      // Limit messages sent to API to save tokens (keep last N messages)
      const contextMessages = updatedMessages.slice(-MAX_CONTEXT_MESSAGES);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: contextMessages,
          timezone: getUserTimezone(),
          // Pass current pending events so AI knows what's actually pending vs confirmed
          hasPendingEvents: pendingEvents.length > 0,
          pendingEventSummaries: pendingEvents.map(e => e.summary),
          hasPendingDeletions: pendingDeletions.length > 0,
          pendingDeletionSummaries: pendingDeletions.map(d => d.summary),
          recentConfirmedEvents: lastConfirmedEvents,
          // Pass available calendars so AI knows which calendars the user can add events to
          calendars: calendarInfo,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      // Check if AI wants to clear pending events (e.g., user said "cancel", "nevermind")
      if (data.clearPendingEvents === true) {
        clearPendingEvents();
        clearPendingDeletions(); // Also clear any pending deletions
      }
      if (data.clearPendingDeletions === true) {
        clearPendingDeletions();
      }

      if (data.pendingEvents && Array.isArray(data.pendingEvents) && data.pendingEvents.length > 0) {
        // Validate and filter pending events to ensure they have required fields
        const validEvents = data.pendingEvents.filter((event: PendingEvent) => {
          if (!event.id || !event.startDateTime || !event.endDateTime) {
            console.warn("Invalid pending event from API:", event);
            return false;
          }
          return true;
        });

        if (validEvents.length > 0) {
          // Enable any calendars that are not currently visible so the user can see the preview
          if (selectedCalendarIds && onEnableCalendar) {
            for (const event of validEvents) {
              if (event.calendarId && !selectedCalendarIds.includes(event.calendarId)) {
                onEnableCalendar(event.calendarId);
              }
            }
          }

          // Set pending events first
          setPendingEvents((prev: PendingEvent[]) => [...prev, ...validEvents]);

          const eventDate = new Date(validEvents[0].startDateTime);
          const eventHour = eventDate.getHours();

          // Auto-collapse chat if event is in the evening (after 6pm) to not block the view
          if (eventHour >= 18) {
            setTimeout(() => setIsExpanded(false), 300);
          }

          // Navigate to the week containing the event (with small delay for state to settle)
          setTimeout(() => {
            if (goToDate) {
              goToDate(eventDate);
            }
            // Scroll to the time of day
            setTimeout(() => {
              setScrollToTime(eventDate);
            }, 150);
          }, 50);
        }
      }

      // Handle pending deletions (similar to pending events)
      if (data.pendingDeletions && Array.isArray(data.pendingDeletions) && data.pendingDeletions.length > 0) {
        const validDeletions = data.pendingDeletions.filter((deletion: PendingDeletion) => {
          if (!deletion.eventId || !deletion.startDateTime || !deletion.endDateTime) {
            console.warn("Invalid pending deletion from API:", deletion);
            return false;
          }
          return true;
        });

        if (validDeletions.length > 0) {
          setPendingDeletions((prev: PendingDeletion[]) => [...prev, ...validDeletions]);

          const eventDate = new Date(validDeletions[0].startDateTime);
          const eventHour = eventDate.getHours();

          // Auto-collapse chat if event is in the evening
          if (eventHour >= 18) {
            setTimeout(() => setIsExpanded(false), 300);
          }

          // Navigate to the event to be deleted
          setTimeout(() => {
            if (goToDate) {
              goToDate(eventDate);
            }
            setTimeout(() => {
              setScrollToTime(eventDate);
            }, 150);
          }, 50);
        }
      }

      // Handle empty or missing content
      const content = data.content || "I processed your request but don't have anything to say.";
      const assistantMessage: Message = { role: "assistant", content };
      setMessages((prev) => [...prev, assistantMessage]);
      // Save both user and assistant messages to history
      saveMessages([userMessage, assistantMessage]);
      triggerRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error && error.name === "AbortError"
        ? "Request timed out. Please try again."
        : "Sorry, something went wrong. Please try again.";
      const assistantMessage: Message = { role: "assistant", content: errorMessage };
      setMessages((prev) => [...prev, assistantMessage]);
      // Still save the user message and error response to history
      saveMessages([userMessage, assistantMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, pendingEvents, pendingDeletions, lastConfirmedEvents, setPendingEvents, clearPendingEvents, clearPendingDeletions, setPendingDeletions, goToDate, setScrollToTime, triggerRefresh, saveMessages, calendars, selectedCalendarIds, onEnableCalendar]);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isMobile) return; // disable drag on mobile to avoid conflicts
    // Only start drag if clicking on the container itself, not interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, input, a")) return;
    dragStateRef.current = {
      startX: e.clientX,
      slotAtStart: slot,
      dragging: true,
    };
    setIsDragging(true);

    const handleMove = (ev: PointerEvent) => {
      if (!dragStateRef.current.dragging) return;
      ev.preventDefault();
      const deltaX = ev.clientX - dragStateRef.current.startX;

      const baseSlotOffset = slotOffsets[dragStateRef.current.slotAtStart] + baseCenterShift;
      const unclamped = baseSlotOffset + deltaX;
      const clamped = Math.min(clampBounds.max, Math.max(clampBounds.min, unclamped));
      setDragOffset(clamped - baseSlotOffset);
    };

    const handleUp = (ev: PointerEvent) => {
      if (!dragStateRef.current.dragging) return;
      const deltaX = ev.clientX - dragStateRef.current.startX;
      const threshold = 30;
      let direction: "left" | "right" | "stay" = "stay";
      if (deltaX > threshold) direction = "right";
      if (deltaX < -threshold) direction = "left";

      const order: ("left" | "center" | "right")[] = ["left", "center", "right"];
      const currentIndex = order.indexOf(dragStateRef.current.slotAtStart);

      const nextSlot = (() => {
        if (direction === "stay") return dragStateRef.current.slotAtStart;
        const step = direction === "right" ? 1 : -1;
        for (let i = currentIndex + step; i >= 0 && i < order.length; i += step) {
          if (allowedSlots.includes(order[i])) return order[i];
        }
        return dragStateRef.current.slotAtStart;
      })();

      setSlot(nextSlot);
      setDragOffset(0);
      setIsDragging(false);
      dragStateRef.current.dragging = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  // Auto-expand when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  const hasMessages = messages.length > 0 || loading;

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50 w-full px-4 pointer-events-none transition-all duration-300 ease-in-out",
        sidebarOpen ? "max-w-lg" : "max-w-xl"
      )}
      style={{
        left: "50%",
        transform: (() => {
          const base = slotOffsets[slot] + baseCenterShift;
          const dynamic = base + (isDragging ? dragOffset : 0);
          const clamped = Math.min(clampBounds.max, Math.max(clampBounds.min, dynamic));
          return `translateX(-50%) translateX(${clamped}px)`;
        })(),
        transition: isDragging ? "none" : undefined,
      }}
      ref={popupRef}
    >
      {/* Combined chat container */}
      <div
        onPointerDown={handleDragPointerDown}
        className={cn(
          "rounded-2xl backdrop-blur-md shadow-sm pointer-events-auto overflow-hidden transition-all duration-200",
          !isMobile && "cursor-grab active:cursor-grabbing",
          isDark
            ? "bg-black/40 border border-white/10"
            : "bg-white/40 border border-black/10"
        )}
      >
        {/* Messages area - collapsible */}
        {hasMessages && isExpanded && (
          <div className="relative max-h-[40vh] overflow-hidden flex flex-col">
            {/* Sticky header with collapse and clear buttons */}
            <div
              className={cn(
                "sticky top-0 z-10 px-3 pt-2 pb-1 flex items-center justify-between",
                isDark ? "bg-black/40" : "bg-white/40"
              )}
              style={{ backdropFilter: "blur(12px)" }}
            >
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer",
                  isDark ? "text-white/50 hover:text-white hover:bg-white/10" : "text-black/50 hover:text-black hover:bg-black/5"
                )}
                title="Collapse chat"
              >
                <svg
                  className="h-4 w-4 rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className={cn(
                  "flex h-7 px-2 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer text-xs gap-1",
                  isDark ? "text-white/40 hover:text-white hover:bg-white/10" : "text-black/40 hover:text-black hover:bg-black/5"
                )}
                title="Clear chat history"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            </div>
            {/* Scrollable messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-2 px-3 pb-2"
            >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? isDark
                        ? "bg-white/20 text-white"
                        : "bg-black/10 text-gray-900"
                      : isDark
                        ? "bg-white/10 text-white/90"
                        : "bg-black/5 text-gray-800"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
                    isDark ? "bg-white/10 text-white/60" : "bg-black/5 text-black/60"
                  )}
                >
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 px-3 py-3">
            {/* Expand button - only show when collapsed and has messages */}
            {hasMessages && !isExpanded && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                  isDark ? "text-white/50 hover:text-white hover:bg-white/10" : "text-black/50 hover:text-black hover:bg-black/5"
                )}
                title="Expand chat"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={messages.length > 0 && !isExpanded ? "Continue conversation..." : "Ask Docket anything..."}
              disabled={loading}
              rows={1}
              className={cn(
                "flex-1 resize-none border-none bg-transparent text-sm outline-none min-h-[24px] max-h-[120px]",
                isDark ? "text-white placeholder-white/40" : "text-gray-900 placeholder-gray-500"
              )}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30",
                isDark ? "bg-white/20 text-white hover:bg-white/30" : "bg-black/10 text-black hover:bg-black/20"
              )}
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
