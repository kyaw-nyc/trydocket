"use client";

import { useMemo } from "react";
import { CalendarEvent, PositionedEvent } from "../types/calendar";
import { layoutDayEvents } from "../utils/layout-utils";

export function useEventLayout(events: CalendarEvent[]): PositionedEvent[] {
  return useMemo(() => layoutDayEvents(events), [events]);
}
