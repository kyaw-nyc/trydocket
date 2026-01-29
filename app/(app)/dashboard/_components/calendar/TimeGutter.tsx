"use client";

import { memo } from "react";
import { HOURS, HOUR_HEIGHT } from "../types/calendar";
import { formatHour } from "../utils/date-utils";

function TimeGutterComponent() {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-14">
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute right-0.5 sm:right-1 text-[9px] sm:text-[11px] font-semibold text-muted-foreground"
          style={{ top: hour * HOUR_HEIGHT - 10 }}
        >
          {hour > 0 && formatHour(hour)}
        </div>
      ))}
    </div>
  );
}

export const TimeGutter = memo(TimeGutterComponent);
