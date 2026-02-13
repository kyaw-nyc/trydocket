"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Sparkles, MessageSquare } from "lucide-react";

type OnboardingModalProps = {
  isDark: boolean;
  onComplete: () => void;
};

const FEATURES = [
  {
    icon: Calendar,
    title: "Your calendar, unified",
    description: "All your Google Calendar events in one clean view. Drag and drop to reschedule.",
  },
  {
    icon: MessageSquare,
    title: "Chat to schedule",
    description: "Just type what you need — \"Set up a meeting Friday at 2pm\" — and it's done.",
  },
  {
    icon: Sparkles,
    title: "Smart & fast",
    description: "Docket learns your preferences over time to make scheduling effortless.",
  },
];

export function OnboardingModal({ isDark, onComplete }: OnboardingModalProps) {
  const [saving, setSaving] = useState(false);

  const handleGetStarted = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [{ key: "onboarding_completed", value: "true" }],
        }),
      });
      onComplete();
    } catch {
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md mx-4 rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-200",
          isDark
            ? "bg-black/60 border border-white/10"
            : "bg-white/70 border border-black/10"
        )}
      >
        <div className="p-6 sm:p-8">
          {/* Welcome header */}
          <div className="text-center mb-6">
            <h1 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-gray-900")}>
              Welcome to Docket
            </h1>
            <p className={cn("text-sm mt-2", isDark ? "text-white/60" : "text-black/60")}>
              Your calendar, powered by AI.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4 mb-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-3.5 items-start">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    isDark ? "bg-white/10" : "bg-black/5"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isDark ? "text-white/70" : "text-black/60")} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", isDark ? "text-white" : "text-gray-900")}>
                    {title}
                  </p>
                  <p className={cn("text-xs mt-0.5 leading-relaxed", isDark ? "text-white/50" : "text-black/50")}>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleGetStarted}
            disabled={saving}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
              isDark
                ? "bg-white text-black hover:bg-white/90"
                : "bg-gray-900 text-white hover:bg-gray-800"
            )}
          >
            {saving ? "Setting up..." : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
}
