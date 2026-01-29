"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useCalendar } from "../CalendarContext";

type ThemeToggleProps = {
  className?: string;
};

function ThemeToggleComponent({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useCalendar();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

export const ThemeToggle = memo(ThemeToggleComponent);
