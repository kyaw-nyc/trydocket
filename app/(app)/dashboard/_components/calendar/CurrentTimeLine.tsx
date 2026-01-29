"use client";

import { memo } from "react";

type CurrentTimeLineProps = {
  top: number;
};

function CurrentTimeLineComponent({ top }: CurrentTimeLineProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
      style={{ top }}
    >
      <div className="h-3 w-3 -ml-1.5 rounded-full bg-destructive shadow-[0_0_0_3px_rgba(255,59,48,0.25)]" />
      <div className="flex-1 h-[2px] bg-destructive" />
    </div>
  );
}

export const CurrentTimeLine = memo(CurrentTimeLineComponent);
