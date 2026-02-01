"use client";

import { Sun, Moon } from "lucide-react";

type ThemeSelectionModalProps = {
  onSelect: (theme: "light" | "dark") => void;
};

export function ThemeSelectionModal({ onSelect }: ThemeSelectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
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
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-neutral-200 bg-white p-6 transition-all hover:border-neutral-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 transition-colors group-hover:bg-neutral-200">
              <Sun className="h-8 w-8 text-amber-500" />
            </div>
            <span className="text-lg font-medium text-neutral-900">Light</span>
            <div className="h-12 w-full rounded-lg border border-neutral-200 bg-gradient-to-b from-white to-neutral-50" />
          </button>

          {/* Dark Mode Option */}
          <button
            onClick={() => onSelect("dark")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-neutral-200 bg-white p-6 transition-all hover:border-neutral-900 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800 transition-colors group-hover:bg-neutral-700">
              <Moon className="h-8 w-8 text-blue-400" />
            </div>
            <span className="text-lg font-medium text-neutral-900">Dark</span>
            <div className="h-12 w-full rounded-lg border border-neutral-700 bg-gradient-to-b from-neutral-800 to-neutral-900" />
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          You can change this later in the settings menu
        </p>
      </div>
    </div>
  );
}
