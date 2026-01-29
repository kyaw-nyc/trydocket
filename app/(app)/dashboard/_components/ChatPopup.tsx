"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { useCalendar } from "./CalendarContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPopup() {
  const { triggerRefresh, theme } = useCalendar();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      // Refresh calendar in case AI made changes
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
          isDark ? "border-[#3c4043] bg-[#202124]" : "border-gray-200 bg-white"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${
            isDark ? "border-[#3c4043]" : "border-gray-200"
          }`}>
            <h2 className={`text-sm font-semibold ${isDark ? "text-[#e8eaed]" : "text-gray-900"}`}>
              AI Assistant
            </h2>
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

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <p className={`text-center text-sm ${isDark ? "text-[#9aa0a6]" : "text-gray-400"}`}>
                  Ask me to manage your calendar.
                  <br />
                  Try &quot;What&apos;s on my schedule today?&quot;
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} theme={theme} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  isDark ? "bg-[#3c4043] text-[#9aa0a6]" : "bg-gray-100 text-gray-500"
                }`}>
                  Thinking...
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
                placeholder="Type a message..."
                className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? "border-[#5f6368] bg-[#303134] text-[#e8eaed]"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
            isDark ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
