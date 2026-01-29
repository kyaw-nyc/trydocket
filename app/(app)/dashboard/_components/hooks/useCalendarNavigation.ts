"use client";

import { useState, useMemo, useCallback } from "react";
import { getWeekDates, getMonthMatrix, startOfWeek, MS_IN_DAY, weekRangeLabel, getTimeZoneAbbr, isToday } from "../utils/date-utils";

export function useCalendarNavigation() {
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const monthMatrix = useMemo(() => getMonthMatrix(baseDate), [baseDate]);
  const timezoneAbbr = useMemo(() => getTimeZoneAbbr(), []);
  const weekLabel = useMemo(() => weekRangeLabel(weekDates), [weekDates]);
  const todayIndex = weekDates.findIndex((d) => isToday(d));

  const goToToday = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const goToPreviousWeek = useCallback(() => {
    setWeekOffset((w) => w - 1);
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset((w) => w + 1);
  }, []);

  const goToDate = useCallback((date: Date) => {
    const todayStart = startOfWeek(new Date());
    const targetStart = startOfWeek(date);
    const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / MS_IN_DAY);
    setWeekOffset(diffDays / 7);
  }, []);

  const goToMonth = useCallback((delta: number) => {
    const next = new Date(baseDate);
    next.setMonth(baseDate.getMonth() + delta);
    goToDate(next);
  }, [baseDate, goToDate]);

  return {
    weekOffset,
    baseDate,
    weekDates,
    monthMatrix,
    timezoneAbbr,
    weekLabel,
    todayIndex,
    goToToday,
    goToPreviousWeek,
    goToNextWeek,
    goToDate,
    goToMonth,
  };
}
