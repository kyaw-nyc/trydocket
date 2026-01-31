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
  const { triggerRefresh, theme, setPendingEvents, pendingEvents, goToDate } = useCalendar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          timezone: getUserTimezone(),
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();

      if (data.pendingEvents && Array.isArray(data.pendingEvents)) {
        setPendingEvents((prev: PendingEvent[]) => [...prev, ...data.pendingEvents]);
        if (data.pendingEvents.length > 0 && goToDate) {
          goToDate(new Date(data.pendingEvents[0].startDateTime));
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      triggerRefresh();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, setPendingEvents, goToDate, triggerRefresh]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const sidebarOffset = !isMobile && sidebarOpen ? "md:left-[calc(50%+120px)]" : "left-1/2";

  return (
    <div
      className={cn(
        "fixed bottom-6 z-50 w-full max-w-xl -translate-x-1/2 px-4 pointer-events-none transition-[left] duration-300 ease-in-out",
        sidebarOffset
      )}
    >
      {/* Centered chat input only - no chatbot panel */}
      <form onSubmit={handleSubmit} className="pointer-events-auto">
        <div
          className={cn(
            "flex items-end gap-3 rounded-2xl px-4 py-3 backdrop-blur-md shadow-sm",
            isDark
              ? "bg-black/40 border border-white/10"
              : "bg-white/40 border border-black/10"
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Docket anything..."
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

      {pendingEvents.length > 0 && (
        <div
          className={cn(
            "mt-2 flex items-center justify-center gap-2 text-xs pointer-events-auto",
            isDark ? "text-white/50" : "text-black/50"
          )}
        >
          <div className={cn("h-1.5 w-1.5 animate-pulse rounded-full", isDark ? "bg-white/60" : "bg-black/60")} />
          {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending
        </div>
      )}
    </div>
  );
}
