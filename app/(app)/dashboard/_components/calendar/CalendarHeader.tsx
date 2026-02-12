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
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type CalendarHeaderProps = {
  weekLabel: string;
  loading: boolean;
  isDark: boolean;
  isViewingCurrentWeek: boolean;
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
  isViewingCurrentWeek,
  onToggleSidebar,
  onToday,
  onPreviousWeek,
  onNextWeek,
  onRefresh,
  onToggleTheme,
}: CalendarHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/landing");
  };

  const iconBtnClass = cn(
    "h-8 w-8 rounded-full cursor-pointer transition-colors",
    isDark
      ? "text-white/70 hover:text-white hover:bg-white/10"
      : "text-foreground/70 hover:text-foreground hover:bg-black/5"
  );

  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-2.5 md:px-6 backdrop-blur-xl border-b transition-colors",
        isDark
          ? "bg-black border-white/[0.08]"
          : "bg-white/60 border-black/[0.06]"
      )}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className={iconBtnClass}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={iconBtnClass}
            onClick={onPreviousWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconBtnClass}
            onClick={onNextWeek}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="ml-1 hidden sm:flex flex-col leading-tight">
          <span className="text-base font-semibold text-foreground truncate max-w-[200px] md:max-w-none">
            {weekLabel}
          </span>
          <span className="text-[11px] text-muted-foreground/70">Week view</span>
        </div>

        {!isViewingCurrentWeek && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "rounded-full px-4 py-1 text-xs font-semibold cursor-pointer transition-all backdrop-blur-sm",
              isDark
                ? "border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                : "border-black/10 bg-black/5 text-foreground/80 hover:bg-black/10 hover:text-foreground"
            )}
            onClick={onToday}
          >
            Today
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className={iconBtnClass}
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
              className={iconBtnClass}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onToggleTheme} className="cursor-pointer">
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
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
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
