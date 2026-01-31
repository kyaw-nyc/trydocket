"use client";

import { CalendarProvider } from "./_components/CalendarContext";
import CalendarPanel from "./_components/CalendarPanel";

export default function DashboardPage() {
  return (
    <CalendarProvider>
      <div className="relative h-full">
        <CalendarPanel />
      </div>
    </CalendarProvider>
  );
}
