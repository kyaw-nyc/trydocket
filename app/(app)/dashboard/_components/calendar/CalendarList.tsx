"use client";

import { memo } from "react";
import { CalendarLegendEntry } from "../types/calendar";
import { cn } from "@/lib/utils";

type CalendarListProps = {
  calendars: CalendarLegendEntry[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

function CalendarListComponent({ calendars, selectedIds, onToggle }: CalendarListProps) {
  return (
    <div className="rounded-xl p-3">
      <p className="text-xs font-semibold text-foreground">My calendars</p>
      <div className="mt-2 space-y-1">
        {calendars.map((entry) => {
          const checked = selectedIds.includes(entry.id);
          const isPreview = entry.id === "preview";
          return (
            <button
              key={entry.id}
              type="button"
              disabled={isPreview}
              onClick={() => !isPreview && onToggle(entry.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent",
                isPreview && "cursor-default opacity-80"
              )}
            >
              <div
                className="flex h-4 w-4 items-center justify-center rounded-md transition-colors"
                style={{
                  backgroundColor: checked ? entry.swatch : `${entry.swatch}1A`,
                }}
              >
                {checked && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-foreground">{entry.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const CalendarList = memo(CalendarListComponent);
