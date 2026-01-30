"use client";

import { memo, useState, useMemo } from "react";
import { CalendarEvent, PositionedEvent, ColorsMap } from "../types/calendar";
import { getContrastColor, darkenColor, getEventColor } from "../utils/color-utils";
import { formatEventTimeRange } from "../utils/date-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { useCalendar } from "../CalendarContext";

type EventCardProps = {
  item: PositionedEvent;
  colors: ColorsMap;
  defaultColor: string | null;
  onSelect: (event: CalendarEvent) => void;
};

function EventCardComponent({ item, colors, defaultColor, onSelect }: EventCardProps) {
  const { event, top, height, leftPercent, widthPercent } = item;
  const [isHovered, setIsHovered] = useState(false);
  const { clearPendingEvents, confirmPendingEvents, isConfirming, theme } = useCalendar();

  const color = getEventColor(event, colors, defaultColor);
  const textColor = getContrastColor(color.background);
  const hoverColor = darkenColor(color.background, 12);
  const timeColor = textColor === "#ffffff" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";
  const locationColor = textColor === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

  // Determine which side to show banner based on day of week
  const bannerPosition = useMemo(() => {
    if (!event.start?.dateTime) return "right";
    const dayOfWeek = new Date(event.start.dateTime).getDay();
    // Sun=0, Mon=1, Tue=2 → banner on right (pointing left)
    // Wed=3, Thu=4, Fri=5, Sat=6 → banner on left (pointing right)
    return dayOfWeek <= 2 ? "right" : "left";
  }, [event.start?.dateTime]);

  const isDark = theme === "dark";

  const handleClick = () => {
    if (event.isPending) return;
    onSelect(event);
  };

  // Pending event with action banner
  if (event.isPending) {
    const bannerBg = isDark ? "bg-white" : "bg-gray-900";
    const bannerText = isDark ? "text-gray-900" : "text-white";
    const bannerHover = isDark ? "hover:bg-gray-200" : "hover:bg-gray-700";
    const arrowColor = isDark ? "border-white" : "border-gray-900";

    return (
      <div
        className="absolute"
        style={{
          top,
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
      >
        {/* Action banner - positioned left or right */}
        <div
          className={`absolute z-20 ${
            bannerPosition === "right"
              ? "left-full ml-2"
              : "right-full mr-2"
          }`}
          style={{ top: 0 }}
        >
          <div className={`${bannerBg} ${bannerText} rounded-xl shadow-2xl px-3 py-2.5 flex flex-col gap-2 min-w-[140px]`}>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isDark ? "bg-gray-900" : "bg-white"} animate-pulse`} />
              <span className="font-semibold text-sm">Add this event?</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className={`flex-1 h-8 ${bannerText} ${bannerHover}`}
                onClick={clearPendingEvents}
                disabled={isConfirming}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                onClick={confirmPendingEvents}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
          {/* Pointer arrow - points toward the event */}
          <div
            className={`absolute top-4 w-0 h-0 ${
              bannerPosition === "right"
                ? `right-full border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] ${arrowColor.replace("border-", "border-r-")}`
                : `left-full border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] ${arrowColor.replace("border-", "border-l-")}`
            }`}
          />
        </div>

        {/* The event card itself */}
        <div
          className="overflow-hidden rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs cursor-default ring-2 ring-primary ring-offset-1 ring-offset-background animate-pulse"
          style={{
            height,
            backgroundColor: color.background,
            color: textColor,
            borderLeft: `2px solid ${darkenColor(color.background, 20)}`,
          }}
        >
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Badge variant="secondary" className="h-4 px-1 sm:px-1.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider bg-white/20 hover:bg-white/20">
              New
            </Badge>
            <p className="flex-1 truncate text-[11px] sm:text-[13px] font-semibold leading-tight">
              {event.summary || "Untitled"}
            </p>
          </div>
          {height > 26 && event.start?.dateTime && (
            <p className="mt-0.5 truncate text-[9px] sm:text-[11px] font-medium" style={{ color: timeColor }}>
              {formatEventTimeRange(event.start.dateTime, event.end?.dateTime)}
            </p>
          )}
          {height > 40 && event.location && (
            <p className="truncate text-[9px] sm:text-[11px]" style={{ color: locationColor }}>
              {event.location}
            </p>
          )}
        </div>
      </div>
    );
  }

  const eventContent = (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute overflow-hidden rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs transition-colors touch-manipulation cursor-pointer hover:shadow-md active:scale-[0.98]"
      style={{
        top,
        height,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        backgroundColor: isHovered ? hoverColor : color.background,
        color: textColor,
        borderLeft: `2px solid ${darkenColor(color.background, 20)}`,
      }}
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        <p className="flex-1 truncate text-[11px] sm:text-[13px] font-semibold leading-tight">
          {event.summary || "Untitled"}
        </p>
      </div>
      {height > 26 && event.start?.dateTime && (
        <p className="mt-0.5 truncate text-[9px] sm:text-[11px] font-medium" style={{ color: timeColor }}>
          {formatEventTimeRange(event.start.dateTime, event.end?.dateTime)}
        </p>
      )}
      {height > 40 && event.location && (
        <p className="truncate text-[9px] sm:text-[11px]" style={{ color: locationColor }}>
          {event.location}
        </p>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {eventContent}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[280px] break-words">
          <p className="font-semibold break-words">{event.summary || "Untitled"}</p>
          {event.start?.dateTime && (
            <p className="text-xs text-muted-foreground">
              {formatEventTimeRange(event.start.dateTime, event.end?.dateTime)}
            </p>
          )}
          {event.location && (
            <p className="text-xs text-muted-foreground break-all">{event.location}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const EventCard = memo(EventCardComponent);
