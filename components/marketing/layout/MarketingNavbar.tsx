"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function useIsScrolled(thresholdPx: number) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setIsScrolled(window.scrollY > thresholdPx);
    };
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [thresholdPx]);

  return isScrolled;
}

type MarketingNavbarProps = {
  children?: React.ReactNode;
};

export function MarketingNavbar({ children }: MarketingNavbarProps) {
  const isScrolled = useIsScrolled(50);
  const shouldCollapse = isScrolled;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-transparent">
      <div
        className={cn(
          "mx-auto transition-[padding] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          shouldCollapse ? "py-4" : "py-6"
        )}
      >
        <div
          className={cn(
            "mx-auto transition-[width] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            shouldCollapse
              ? "w-[min(980px,calc(100%-32px))]"
              : "w-[min(1400px,calc(100%-48px))]"
          )}
        >
          <nav
            className={cn(
              "relative transition-[background-color,backdrop-filter,border-color,box-shadow,border-radius] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              shouldCollapse
                ? "rounded-full border border-white/30 bg-white/20 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
                : "rounded-none border border-transparent bg-transparent shadow-none"
            )}
            aria-label="Primary navigation"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                shouldCollapse ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-xl" />
              <div className="absolute inset-0 rounded-full ring-1 ring-white/40" />
            </div>

            <div
              className={cn(
                "relative flex items-center justify-between transition-[padding] duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                shouldCollapse ? "px-6 py-3" : "px-0 py-0"
              )}
            >
              <Link
                href="/landing"
                className="flex items-center gap-3 shrink-0 text-neutral-900"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-900">
                  <svg
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-[20px] tracking-tight">
                  Docket
                </span>
              </Link>

              <div className="shrink-0">{children}</div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
