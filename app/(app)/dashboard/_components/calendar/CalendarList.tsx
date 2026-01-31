"use client";

import { memo, useMemo } from "react";
import { CalendarLegendEntry } from "../types/calendar";
import { cn } from "@/lib/utils";

type CalendarListProps = {
  calendars: CalendarLegendEntry[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

function CalendarItem({
  entry,
  checked,
  onToggle
}: {
  entry: CalendarLegendEntry;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const isPreview = entry.id === "preview";
  return (
    <button
      type="button"
      disabled={isPreview}
      onClick={() => !isPreview && onToggle(entry.id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent",
        isPreview ? "cursor-default opacity-80" : "cursor-pointer"
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
}

function CalendarListComponent({ calendars, selectedIds, onToggle }: CalendarListProps) {
  const { myCalendars, otherCalendars, pendingCalendar } = useMemo(() => {
    const my: CalendarLegendEntry[] = [];
    const other: CalendarLegendEntry[] = [];
    let pending: CalendarLegendEntry | null = null;

    for (const cal of calendars) {
      if (cal.id === "preview") {
        pending = cal;
      } else if (cal.isOwned || cal.isPrimary) {
        my.push(cal);
      } else {
        other.push(cal);
      }
    }

    return { myCalendars: my, otherCalendars: other, pendingCalendar: pending };
  }, [calendars]);

  return (
    <div className="space-y-4">
      {/* My Calendars Section */}
      <div className="rounded-xl p-3">
        <p className="text-xs font-semibold text-foreground">My calendars</p>
        <div className="mt-2 space-y-1">
          {myCalendars.map((entry) => (
            <CalendarItem
              key={entry.id}
              entry={entry}
              checked={selectedIds.includes(entry.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      {/* Other Calendars Section */}
      {otherCalendars.length > 0 && (
        <div className="rounded-xl p-3">
          <p className="text-xs font-semibold text-foreground">Other calendars</p>
          <div className="mt-2 space-y-1">
            {otherCalendars.map((entry) => (
              <CalendarItem
                key={entry.id}
                entry={entry}
                checked={selectedIds.includes(entry.id)}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pending Events */}
      {pendingCalendar && (
        <div className="rounded-xl p-3">
          <CalendarItem
            entry={pendingCalendar}
            checked={selectedIds.includes(pendingCalendar.id)}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
}

export const CalendarList = memo(CalendarListComponent);
