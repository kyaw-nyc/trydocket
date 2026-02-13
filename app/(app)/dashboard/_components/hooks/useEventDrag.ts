"use client";

import { useRef, useCallback, useState } from "react";
import { CalendarEvent, PositionedEvent, HOUR_HEIGHT } from "../types/calendar";
import {
  SNAP_PX,
  snapToGrid,
  pxToMinutes,
  formatTimeFromMinutes,
  buildDateTime,
} from "../utils/snap-utils";

export type DragMode = "move" | "resize";

export type DragState = {
  eventId: string;
  calendarId?: string;
  mode: DragMode;
  item: PositionedEvent;
  originDayIndex: number;
  currentDayIndex: number;
};

type UseEventDragOptions = {
  weekDates: Date[];
  dayColumnRefs: React.RefObject<(HTMLDivElement | null)[]>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onDragEnd: (
    eventId: string,
    calendarId: string | undefined,
    newStart: string,
    newEnd: string,
    event: CalendarEvent
  ) => void;
  onSelect: (event: CalendarEvent, position?: { x: number; y: number }) => void;
};

const DRAG_THRESHOLD = 3;
const AUTO_SCROLL_ZONE = 40;
const AUTO_SCROLL_SPEED = 8;

export function useEventDrag({
  weekDates,
  dayColumnRefs,
  scrollContainerRef,
  onDragEnd,
  onSelect,
}: UseEventDragOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const isDraggingRef = useRef(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<{
    active: boolean;
    exceeded: boolean;
    mode: DragMode;
    item: PositionedEvent;
    originDayIndex: number;
    currentDayIndex: number;
    originX: number;
    originY: number;
    originalTop: number;
    originalHeight: number;
  } | null>(null);

  const cleanUp = useCallback(() => {
    dragRef.current = null;
    setDragState(null);
    isDraggingRef.current = false;
  }, []);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      mode: DragMode,
      item: PositionedEvent,
      dayIndex: number
    ) => {
      if (item.event.isPending || item.event.isPendingDeletion) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        active: true,
        exceeded: false,
        mode,
        item,
        originDayIndex: dayIndex,
        currentDayIndex: dayIndex,
        originX: e.clientX,
        originY: e.clientY,
        originalTop: item.top,
        originalHeight: item.height,
      };

      const onMove = (me: PointerEvent) => {
        const dr = dragRef.current;
        if (!dr || !dr.active) return;

        const dx = me.clientX - dr.originX;
        const dy = me.clientY - dr.originY;

        if (!dr.exceeded) {
          if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
          dr.exceeded = true;
          isDraggingRef.current = true;
          setDragState({
            eventId: dr.item.event.id,
            calendarId: dr.item.event.calendarId,
            mode: dr.mode,
            item: dr.item,
            originDayIndex: dr.originDayIndex,
            currentDayIndex: dr.currentDayIndex,
          });
          return; // overlay not in DOM yet
        }

        const overlay = overlayRef.current;
        const label = labelRef.current;
        if (!overlay) return;

        if (dr.mode === "resize") {
          const rawHeight = dr.originalHeight + dy;
          const snappedHeight = Math.max(SNAP_PX, snapToGrid(rawHeight));
          overlay.style.top = `${dr.originalTop}px`;
          overlay.style.height = `${snappedHeight}px`;

          const startMin = pxToMinutes(dr.originalTop);
          const endMin = pxToMinutes(dr.originalTop + snappedHeight);
          if (label) {
            label.textContent = `${formatTimeFromMinutes(startMin)} – ${formatTimeFromMinutes(endMin)}`;
          }
        } else {
          const rawTop = dr.originalTop + dy;
          const snappedTop = Math.max(0, Math.min(snapToGrid(rawTop), HOUR_HEIGHT * 24 - SNAP_PX));
          overlay.style.top = `${snappedTop}px`;
          overlay.style.height = `${dr.originalHeight}px`;

          const cols = dayColumnRefs.current;
          if (cols) {
            for (let i = 0; i < cols.length; i++) {
              const col = cols[i];
              if (!col) continue;
              const rect = col.getBoundingClientRect();
              if (me.clientX >= rect.left && me.clientX <= rect.right) {
                if (dr.currentDayIndex !== i) {
                  dr.currentDayIndex = i;
                  const gridContainer = col.parentElement;
                  if (gridContainer) {
                    const gridRect = gridContainer.getBoundingClientRect();
                    overlay.style.left = `${rect.left - gridRect.left}px`;
                    overlay.style.width = `${rect.width}px`;
                  }
                  setDragState((prev) =>
                    prev ? { ...prev, currentDayIndex: i } : prev
                  );
                }
                break;
              }
            }
          }

          const startMin = pxToMinutes(snappedTop);
          const endMin = pxToMinutes(snappedTop + dr.originalHeight);
          if (label) {
            label.textContent = `${formatTimeFromMinutes(startMin)} – ${formatTimeFromMinutes(endMin)}`;
          }
        }

        // Auto-scroll
        const sc = scrollContainerRef.current;
        if (sc) {
          const rect = sc.getBoundingClientRect();
          const relY = me.clientY - rect.top;
          if (relY < AUTO_SCROLL_ZONE) {
            sc.scrollTop -= AUTO_SCROLL_SPEED;
          } else if (relY > rect.height - AUTO_SCROLL_ZONE) {
            sc.scrollTop += AUTO_SCROLL_SPEED;
          }
        }
      };

      const onUp = (ue: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);

        const dr = dragRef.current;
        if (!dr) return;

        if (!dr.exceeded) {
          cleanUp();
          onSelect(item.event, { x: ue.clientX, y: ue.clientY });
          return;
        }

        // Calculate final position
        const overlay = overlayRef.current;
        if (overlay) {
          const finalTop = parseFloat(overlay.style.top) || 0;
          const finalHeight = parseFloat(overlay.style.height) || dr.originalHeight;

          const startMin = pxToMinutes(finalTop);
          const endMin = pxToMinutes(finalTop + finalHeight);

          const targetDate = weekDates[dr.currentDayIndex] || weekDates[dr.originDayIndex];
          const newStart = buildDateTime(targetDate, startMin);
          const newEnd = buildDateTime(targetDate, endMin);

          // Pass event object so caller can do optimistic update
          onDragEnd(dr.item.event.id, dr.item.event.calendarId, newStart, newEnd, dr.item.event);
        }

        cleanUp();
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [weekDates, dayColumnRefs, scrollContainerRef, onDragEnd, onSelect, cleanUp]
  );

  return { dragState, isDraggingRef, handlePointerDown, overlayRef, labelRef };
}
