"use client";

import { CalendarProvider } from "./_components/CalendarContext";
import CalendarPanel from "./_components/CalendarPanel";
import ChatPopup from "./_components/ChatPopup";

export default function DashboardPage() {
  return (
    <CalendarProvider>
      <div className="relative h-full">
        <CalendarPanel />
        <ChatPopup />
      </div>
    </CalendarProvider>
  );
}
