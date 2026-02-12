"use client";

import { Sun, Moon } from "lucide-react";

type ThemeSelectionModalProps = {
  onSelect: (theme: "light" | "dark") => void;
};

export function ThemeSelectionModal({ onSelect }: ThemeSelectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl backdrop-blur-xl bg-white/70 border border-black/10 p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Welcome to Docket
          </h2>
          <p className="mt-2 text-neutral-600">
            Choose your preferred appearance
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {/* Light Mode Option */}
          <button
            onClick={() => onSelect("light")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-black/10 bg-white/50 backdrop-blur-sm p-6 transition-all hover:border-neutral-900 hover:shadow-lg hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50/80 transition-colors group-hover:bg-amber-100/80">
              <Sun className="h-8 w-8 text-amber-500" />
            </div>
            <span className="text-lg font-medium text-neutral-900">Light</span>
            <div className="h-12 w-full rounded-lg border border-neutral-200/60 bg-gradient-to-b from-white/80 to-neutral-50/80" />
          </button>

          {/* Dark Mode Option */}
          <button
            onClick={() => onSelect("dark")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-black/10 bg-white/50 backdrop-blur-sm p-6 transition-all hover:border-neutral-900 hover:shadow-lg hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800/80 backdrop-blur-sm transition-colors group-hover:bg-neutral-700/80">
              <Moon className="h-8 w-8 text-blue-400" />
            </div>
            <span className="text-lg font-medium text-neutral-900">Dark</span>
            <div className="h-12 w-full rounded-lg border border-neutral-700/60 bg-gradient-to-b from-neutral-800/80 to-neutral-900/80" />
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          You can change this later in the settings menu
        </p>
      </div>
    </div>
  );
}
