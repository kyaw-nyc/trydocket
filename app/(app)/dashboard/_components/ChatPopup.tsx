"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCalendar, PendingEvent } from "./CalendarContext";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatPopupProps = {
  sidebarOpen?: boolean;
  isMobile?: boolean;
};

export default function ChatPopup({ sidebarOpen = false, isMobile = false }: ChatPopupProps) {
  const { triggerRefresh, theme, setPendingEvents, clearPendingEvents, goToDate, setScrollToTime } = useCalendar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";

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

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Los_Angeles";
    }
  };

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
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          timezone: getUserTimezone(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      // Check if AI wants to clear pending events (e.g., user said "cancel", "nevermind")
      if (data.clearPendingEvents === true) {
        clearPendingEvents();
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

      // Handle empty or missing content
      const content = data.content || "I processed your request but don't have anything to say.";
      setMessages((prev) => [...prev, { role: "assistant", content }]);
      triggerRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error && error.name === "AbortError"
        ? "Request timed out. Please try again."
        : "Sorry, something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, setPendingEvents, clearPendingEvents, goToDate, setScrollToTime, triggerRefresh]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const sidebarOffset = !isMobile && sidebarOpen ? "md:left-[calc(50%+120px)]" : "left-1/2";

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
        "fixed bottom-6 z-50 w-full max-w-xl -translate-x-1/2 px-4 pointer-events-none transition-[left] duration-300 ease-in-out",
        sidebarOffset
      )}
    >
      {/* Combined chat container */}
      <div
        className={cn(
          "rounded-2xl backdrop-blur-md shadow-sm pointer-events-auto overflow-hidden transition-all duration-200",
          isDark
            ? "bg-black/40 border border-white/10"
            : "bg-white/40 border border-black/10"
        )}
      >
        {/* Messages area - collapsible */}
        {hasMessages && isExpanded && (
          <div className="relative max-h-[40vh] overflow-hidden flex flex-col">
            {/* Sticky collapse button at top */}
            <div
              className={cn(
                "sticky top-0 z-10 px-3 pt-2 pb-1",
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
