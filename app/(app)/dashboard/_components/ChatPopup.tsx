"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { useCalendar, PendingEvent } from "./CalendarContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPopup() {
  const { triggerRefresh, theme, setPendingEvents, pendingEvents } = useCalendar();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPendingCountRef = useRef(pendingEvents.length);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-collapse chat when new pending events are added so user can see the calendar
  useEffect(() => {
    if (pendingEvents.length > prevPendingCountRef.current && isOpen) {
      setIsOpen(false);
    }
    prevPendingCountRef.current = pendingEvents.length;
  }, [pendingEvents.length, isOpen]);

  // Get user's timezone
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/Los_Angeles";
    }
  };

  async function handleSubmit(e: React.FormEvent) {
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
      
      // Handle pending events from AI response
      if (data.pendingEvents && Array.isArray(data.pendingEvents)) {
        setPendingEvents((prev: PendingEvent[]) => [...prev, ...data.pendingEvents]);
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      
      // Refresh calendar in case AI made changes (updates/deletes)
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
  }

  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className={`flex h-[500px] w-[380px] flex-col rounded-xl border shadow-2xl ${
          isDark ? "border-[#3c4043] bg-[#131314]" : "border-gray-200 bg-white"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${
            isDark ? "border-[#3c4043]" : "border-gray-200"
          }`}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isDark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-sm font-semibold ${isDark ? "text-[#e8eaed]" : "text-gray-900"}`}>
                  Docket AI
                </h2>
                <p className={`text-xs ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                  Your calendar assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className={`rounded-md p-1 ${
                isDark ? "text-[#9aa0a6] hover:bg-[#3c4043]" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Pending events indicator */}
          {pendingEvents.length > 0 && (
            <div className={`flex items-center gap-2 px-4 py-2 text-xs ${
              isDark ? "bg-white/5 text-white/80" : "bg-black/5 text-black/80"
            }`}>
              <div className={`h-2 w-2 rounded-full animate-pulse ${isDark ? "bg-white" : "bg-black"}`} />
              {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending confirmation
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
                  isDark ? "bg-[#303134]" : "bg-gray-100"
                }`}>
                  <svg className={`h-8 w-8 ${isDark ? "text-[#9aa0a6]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${isDark ? "text-[#e8eaed]" : "text-gray-900"}`}>
                    Hi! I&apos;m Docket
                  </p>
                  <p className={`mt-1 text-xs ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                    I can help you manage your calendar.
                  </p>
                </div>
                <div className={`w-full space-y-2 ${isDark ? "text-[#9aa0a6]" : "text-gray-500"}`}>
                  <p className="text-center text-xs font-medium uppercase tracking-wide opacity-60">Try asking:</p>
                  {[
                    "What's on my schedule today?",
                    "Add 1 hour of reading time",
                    "Schedule a meeting tomorrow at 3pm",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        isDark 
                          ? "border-[#3c4043] hover:bg-[#303134] hover:text-[#e8eaed]" 
                          : "border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} theme={theme} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm ${
                  isDark ? "bg-[#303134] text-[#9aa0a6]" : "bg-gray-100 text-gray-500"
                }`}>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className={`border-t p-3 ${isDark ? "border-[#3c4043]" : "border-gray-200"}`}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your calendar..."
                className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? "border-[#5f6368] bg-[#303134] text-[#e8eaed] placeholder-[#9aa0a6]"
                    : "border-gray-300 bg-white text-gray-900 placeholder-gray-400"
                }`}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 ${
            isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          <svg className="h-6 w-6 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {pendingEvents.length > 0 && (
            <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
              isDark ? "bg-black text-white" : "bg-white text-black"
            }`}>
              {pendingEvents.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
