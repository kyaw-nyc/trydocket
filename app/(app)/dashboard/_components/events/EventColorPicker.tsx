"use client";

import { memo } from "react";
import { COLOR_OPTIONS } from "../types/calendar";
import { cn } from "@/lib/utils";

type EventColorPickerProps = {
  selectedColorId: string;
  onSelect: (colorId: string) => void;
};

function EventColorPickerComponent({ selectedColorId, onSelect }: EventColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((color) => (
        <button
          key={color.id}
          type="button"
          onClick={() => onSelect(color.id)}
          className={cn(
            "h-8 w-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            selectedColorId === color.id && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          )}
          style={{ backgroundColor: color.background }}
          title={color.name}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  );
}

export const EventColorPicker = memo(EventColorPickerComponent);
