"use client";

import { memo, useState } from "react";
import { CalendarEvent, PositionedEvent, ColorsMap } from "../types/calendar";
import { getContrastColor, darkenColor, getEventColor } from "../utils/color-utils";
import { formatEventTimeRange } from "../utils/date-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

type EventCardProps = {
  item: PositionedEvent;
  colors: ColorsMap;
  defaultColor: string | null;
  onSelect: (event: CalendarEvent) => void;
};

function EventCardComponent({ item, colors, defaultColor, onSelect }: EventCardProps) {
  const { event, top, height, leftPercent, widthPercent } = item;
  const [isHovered, setIsHovered] = useState(false);

  const color = getEventColor(event, colors, defaultColor);
  const textColor = getContrastColor(color.background);
  const hoverColor = darkenColor(color.background, 12);
  const timeColor = textColor === "#ffffff" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";
  const locationColor = textColor === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

  const handleClick = () => {
    if (event.isPending) return;
    onSelect(event);
  };

  const eventContent = (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute overflow-hidden rounded-md sm:rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-xs transition-colors touch-manipulation ${
        event.isPending
          ? "cursor-default ring-2 ring-primary/60 ring-offset-1 ring-offset-background"
          : "cursor-pointer hover:shadow-md active:scale-[0.98]"
      }`}
      style={{
        top,
        height,
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        backgroundColor: isHovered && !event.isPending ? hoverColor : color.background,
        color: textColor,
        borderLeft: `2px solid ${darkenColor(color.background, 20)}`,
      }}
    >
      <div className="flex items-center gap-1 sm:gap-1.5">
        {event.isPending && (
          <Badge variant="secondary" className="h-4 px-1 sm:px-1.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider bg-white/20 hover:bg-white/20">
            New
          </Badge>
        )}
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

  if (event.isPending) {
    return eventContent;
  }

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
