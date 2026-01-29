"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";
import { useCalendar } from "../CalendarContext";
import { cn } from "@/lib/utils";

type PendingEventsBannerProps = {
  className?: string;
};

function PendingEventsBannerComponent({ className }: PendingEventsBannerProps) {
  const { pendingEvents, clearPendingEvents, confirmPendingEvents, isConfirming } = useCalendar();

  if (pendingEvents.length === 0) return null;

  return (
    <div
      className={cn(
        "mx-2 sm:mx-4 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card px-3 sm:px-4 py-3 md:mx-6",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} ready to add
          </p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Review the highlighted previews on your calendar
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearPendingEvents}
          disabled={isConfirming}
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={confirmPendingEvents}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add to Calendar"
          )}
        </Button>
      </div>
    </div>
  );
}

export const PendingEventsBanner = memo(PendingEventsBannerComponent);
