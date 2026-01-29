"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type CalendarHeaderProps = {
  weekLabel: string;
  loading: boolean;
  isDark: boolean;
  onToggleSidebar: () => void;
  onToday: () => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onRefresh: () => void;
  onToggleTheme: () => void;
};

function CalendarHeaderComponent({
  weekLabel,
  loading,
  isDark,
  onToggleSidebar,
  onToday,
  onPreviousWeek,
  onNextWeek,
  onRefresh,
  onToggleTheme,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full",
            isDark && "text-white hover:bg-white/10 hover:text-white"
          )}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-full px-4 font-semibold",
              isDark && "border-white text-white hover:bg-white/10 hover:text-white"
            )}
            onClick={onToday}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              isDark && "text-white hover:bg-white/10 hover:text-white"
            )}
            onClick={onPreviousWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              isDark && "text-white hover:bg-white/10 hover:text-white"
            )}
            onClick={onNextWeek}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-1 hidden sm:flex flex-col leading-tight">
          <span className="text-lg font-semibold text-foreground truncate max-w-[200px] md:max-w-none">
            {weekLabel}
          </span>
          <span className="text-xs text-muted-foreground">Week view</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full",
            isDark && "text-white hover:bg-white/10 hover:text-white"
          )}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full",
                isDark && "text-white hover:bg-white/10 hover:text-white"
              )}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onToggleTheme}>
              {isDark ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Light mode
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark mode
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/landing" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export const CalendarHeader = memo(CalendarHeaderComponent);
