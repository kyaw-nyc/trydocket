"use client";

import { useState } from "react";

type CalendarEvent = {
  id: string;
  summary?: string;
  colorId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

type ColorOption = {
  id: string;
  background: string;
  name: string;
};

const COLOR_OPTIONS: ColorOption[] = [
  { id: "1", background: "#7986cb", name: "Lavender" },
  { id: "2", background: "#33b679", name: "Sage" },
  { id: "3", background: "#8e24aa", name: "Grape" },
  { id: "4", background: "#e67c73", name: "Flamingo" },
  { id: "5", background: "#f6bf26", name: "Banana" },
  { id: "6", background: "#f4511e", name: "Tangerine" },
  { id: "7", background: "#039be5", name: "Peacock" },
  { id: "8", background: "#616161", name: "Graphite" },
  { id: "9", background: "#3f51b5", name: "Blueberry" },
  { id: "10", background: "#0b8043", name: "Basil" },
  { id: "11", background: "#d50000", name: "Tomato" },
];

type EventModalProps = {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (eventId: string, updates: { summary?: string; colorId?: string }) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  theme?: "light" | "dark";
};

export default function EventModal({ event, onClose, onSave, onDelete, theme = "light" }: EventModalProps) {
  const [summary, setSummary] = useState(event.summary || "");
  const [colorId, setColorId] = useState(event.colorId || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDark = theme === "dark";

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(event.id, { summary, colorId: colorId || undefined });
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event?")) return;
    setDeleting(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-lg p-6 shadow-xl ${
          isDark ? "bg-[#2d2e30]" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${isDark ? "text-[#e8eaed]" : "text-gray-900"}`}>
            Edit Event
          </h2>
          <button
            onClick={onClose}
            className={isDark ? "text-[#9aa0a6] hover:text-[#e8eaed]" : "text-gray-400 hover:text-gray-600"}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className={`mb-1 block text-sm font-medium ${isDark ? "text-[#9aa0a6]" : "text-gray-700"}`}>
              Title
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isDark
                  ? "border-[#5f6368] bg-[#303134] text-[#e8eaed]"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            />
          </div>

          {/* Time display (read-only) */}
          <div>
            <label className={`mb-1 block text-sm font-medium ${isDark ? "text-[#9aa0a6]" : "text-gray-700"}`}>
              Time
            </label>
            <p className={`text-sm ${isDark ? "text-[#e8eaed]" : "text-gray-600"}`}>
              {formatDateTime(event.start?.dateTime)}
              {event.end?.dateTime && ` - ${formatDateTime(event.end.dateTime)}`}
            </p>
          </div>

          {/* Color picker */}
          <div>
            <label className={`mb-2 block text-sm font-medium ${isDark ? "text-[#9aa0a6]" : "text-gray-700"}`}>
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setColorId(color.id)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                    colorId === color.id
                      ? isDark
                        ? "ring-2 ring-[#e8eaed] ring-offset-2 ring-offset-[#2d2e30]"
                        : "ring-2 ring-gray-900 ring-offset-2"
                      : ""
                  }`}
                  style={{ backgroundColor: color.background }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-red-500 disabled:opacity-50 ${
              isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"
            }`}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                isDark
                  ? "border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
