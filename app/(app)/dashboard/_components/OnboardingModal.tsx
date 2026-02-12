"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type OnboardingModalProps = {
  isDark: boolean;
  onComplete: () => void;
};

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const DURATION_OPTIONS = [
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "60 min", value: "60" },
];

export function OnboardingModal({ isDark, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [timezone, setTimezone] = useState("");
  const [location, setLocation] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [saving, setSaving] = useState(false);

  // Auto-detect timezone on mount
  useEffect(() => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {
      setTimezone("America/New_York");
    }
  }, []);

  const totalSteps = 3;

  const handleNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      // Save timezone to profiles
      await fetch("/api/user/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });

      // Save all preferences
      const preferences = [
        { key: "timezone", value: timezone },
        { key: "location", value: location },
        { key: "preferred_meeting_duration", value: `${meetingDuration} minutes` },
        { key: "onboarding_completed", value: "true" },
      ].filter((p) => p.value);

      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      onComplete();
    } catch (error) {
      console.error("Failed to save onboarding preferences:", error);
      onComplete(); // Still complete even if save fails
    } finally {
      setSaving(false);
    }
  }, [timezone, location, meetingDuration, onComplete]);

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
        {/* Progress bar */}
        <div className="h-1 bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-foreground/30 transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step indicator */}
          <div className={cn("text-xs font-medium mb-1", isDark ? "text-white/40" : "text-black/40")}>
            Step {step + 1} of {totalSteps}
          </div>

          {/* Step 0: Timezone */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>
                  Your timezone
                </h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-black/60")}>
                  We auto-detected your timezone. Change it if needed.
                </p>
              </div>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-sm border outline-none transition-colors",
                  isDark
                    ? "bg-white/10 border-white/10 text-white focus:border-white/30"
                    : "bg-black/5 border-black/10 text-gray-900 focus:border-black/30"
                )}
              >
                {/* Show detected timezone first if not in common list */}
                {timezone && !COMMON_TIMEZONES.includes(timezone) && (
                  <option value={timezone}>{timezone} (detected)</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}{tz === timezone ? " (detected)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>
                  Your location
                </h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-black/60")}>
                  City or region for location-aware scheduling.
                </p>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA"
                className={cn(
                  "w-full rounded-xl px-4 py-3 text-sm border outline-none transition-colors",
                  isDark
                    ? "bg-white/10 border-white/10 text-white placeholder-white/30 focus:border-white/30"
                    : "bg-black/5 border-black/10 text-gray-900 placeholder-black/30 focus:border-black/30"
                )}
              />
              <button
                onClick={handleNext}
                className={cn(
                  "text-xs",
                  isDark ? "text-white/40 hover:text-white/60" : "text-black/40 hover:text-black/60"
                )}
              >
                Skip this step
              </button>
            </div>
          )}

          {/* Step 2: Default event duration */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className={cn("text-xl font-semibold", isDark ? "text-white" : "text-gray-900")}>
                  Default event length
                </h2>
                <p className={cn("text-sm mt-1", isDark ? "text-white/60" : "text-black/60")}>
                  How long should events be when you don&apos;t specify?
                </p>
              </div>
              <div className="flex gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMeetingDuration(opt.value)}
                    className={cn(
                      "flex-1 rounded-xl py-3 text-sm font-medium border transition-all",
                      meetingDuration === opt.value
                        ? isDark
                          ? "bg-white/20 border-white/30 text-white"
                          : "bg-black/10 border-black/20 text-gray-900"
                        : isDark
                          ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          : "bg-black/5 border-black/10 text-black/60 hover:bg-black/10"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  isDark
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-black/60 hover:text-black hover:bg-black/5"
                )}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-semibold transition-colors",
                  isDark
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-black/10 text-gray-900 hover:bg-black/20"
                )}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
                  isDark
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-gray-900 text-white hover:bg-gray-800"
                )}
              >
                {saving ? "Saving..." : "Get started"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
