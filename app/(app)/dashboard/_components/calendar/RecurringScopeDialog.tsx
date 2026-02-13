"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCalendar } from "../CalendarContext";
import { cn } from "@/lib/utils";

type RecurringScopeDialogProps = {
  anchor: { x: number; y: number };
  eventSummary: string;
  action: "move" | "resize";
  onSelect: (scope: "this" | "following" | "all") => void;
  onCancel: () => void;
};

const DIALOG_WIDTH = 260;
const DIALOG_PADDING = 12;

function computePosition(anchor: { x: number; y: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estHeight = 220;

  // Try to place to the right of the drop point, vertically centered
  let left = anchor.x + 16;
  let top = anchor.y - estHeight / 2;

  // If it overflows the right edge, place to the left instead
  if (left + DIALOG_WIDTH > vw - DIALOG_PADDING) {
    left = anchor.x - DIALOG_WIDTH - 16;
  }

  // Keep within viewport bounds
  if (left < DIALOG_PADDING) left = DIALOG_PADDING;
  if (top + estHeight > vh - DIALOG_PADDING) top = vh - estHeight - DIALOG_PADDING;
  if (top < DIALOG_PADDING) top = DIALOG_PADDING;

  return { top, left };
}

export function RecurringScopeDialog({
  anchor,
  eventSummary,
  action,
  onSelect,
  onCancel,
}: RecurringScopeDialogProps) {
  const { theme } = useCalendar();
  const isDark = theme === "dark";
  const dialogRef = useRef<HTMLDivElement>(null);
  const pos = computePosition(anchor);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Delay to avoid the current click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onCancel]);

  const options: { label: string; scope: "this" | "following" | "all" }[] = [
    { label: "This event", scope: "this" },
    { label: "This and following events", scope: "following" },
    { label: "All events", scope: "all" },
  ];

  return createPortal(
    <div
      ref={dialogRef}
      className={cn(
        "fixed z-50 rounded-xl border shadow-xl animate-in fade-in zoom-in-95 duration-150",
        isDark
          ? "bg-zinc-900/90 border-white/10 backdrop-blur-xl text-white"
          : "bg-white/90 border-black/10 backdrop-blur-xl text-zinc-900"
      )}
      style={{
        top: pos.top,
        left: pos.left,
        width: DIALOG_WIDTH,
      }}
    >
      <div className="px-3 pt-3 pb-1.5">
        <p className={cn(
          "text-xs font-medium",
          isDark ? "text-zinc-400" : "text-zinc-500"
        )}>
          Edit recurring event
        </p>
        <p className="text-sm font-semibold truncate mt-0.5">
          {eventSummary || "Untitled"}
        </p>
      </div>

      <div className="px-2 pb-2 space-y-0.5">
        {options.map(({ label, scope }) => (
          <button
            key={scope}
            onClick={() => onSelect(scope)}
            className={cn(
              "w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
              isDark
                ? "hover:bg-white/10 active:bg-white/15"
                : "hover:bg-black/5 active:bg-black/10"
            )}
          >
            {label}
          </button>
        ))}

        <div className={cn(
          "border-t my-1",
          isDark ? "border-white/10" : "border-black/10"
        )} />

        <button
          onClick={onCancel}
          className={cn(
            "w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-colors",
            isDark
              ? "text-zinc-400 hover:bg-white/10 hover:text-white"
              : "text-zinc-500 hover:bg-black/5 hover:text-zinc-900"
          )}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
