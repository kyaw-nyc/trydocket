"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDark = theme === "dark";

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus input after loading completes
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-expand when messages exist
  useEffect(() => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
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

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();

      if (data.pendingEvents && Array.isArray(data.pendingEvents)) {
        setPendingEvents((prev: PendingEvent[]) => [...prev, ...data.pendingEvents]);

        if (data.pendingEvents.length > 0 && goToDate) {
          const firstEventDate = new Date(data.pendingEvents[0].startDateTime);
          goToDate(firstEventDate);
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);

      triggerRefresh();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
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

  const handleClearChat = () => {
    setMessages([]);
    setIsExpanded(false);
    inputRef.current?.focus();
  };

  // When sidebar is open on desktop, offset the chat to center on the calendar area
  // Sidebar is 240px (w-60), so we add half of that (120px) to the left position
  const sidebarOffset = !isMobile && sidebarOpen ? "md:left-[calc(50%+120px)]" : "left-1/2";

  return (
    <div className={cn(
      "fixed bottom-6 z-50 w-full max-w-xl -translate-x-1/2 px-4 pointer-events-none transition-[left] duration-300 ease-in-out",
      sidebarOffset
    )}>
      {/* Messages container - only shows when there are messages */}
      {isExpanded && messages.length > 0 && (
        <div
          className={cn(
            "mb-3 rounded-2xl backdrop-blur-md shadow-sm pointer-events-auto",
            isDark
              ? "bg-black/40 border border-white/10"
              : "bg-white/40 border border-black/10"
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between px-4 py-2",
              isDark ? "border-b border-white/10" : "border-b border-black/5"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  isDark ? "bg-white/20" : "bg-black/10"
                )}
              >
                <svg className={cn("h-3 w-3", isDark ? "text-white" : "text-black")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className={cn("text-xs font-medium", isDark ? "text-white/80" : "text-black/80")}>
                Docket AI
              </span>
            </div>
            <button
              onClick={handleClearChat}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors",
                isDark
                  ? "text-white/50 hover:text-white hover:bg-white/10"
                  : "text-black/50 hover:text-black hover:bg-black/5"
              )}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="max-h-[40vh] space-y-2 overflow-y-auto p-3">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} theme={theme} />
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

      {/* Input bar - always visible, glossy transparent */}
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
              "flex-1 resize-none border-none bg-transparent text-sm outline-none",
              "min-h-[24px] max-h-[120px]",
              isDark
                ? "text-white placeholder-white/40"
                : "text-gray-900 placeholder-gray-500"
            )}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
              "disabled:opacity-30",
              isDark
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-black/10 text-black hover:bg-black/20"
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

      {/* Pending events indicator */}
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
