export type PendingDeletionInfo = {
  eventId: string;
  calendarId?: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
};

export type CalendarEvent = {
  id: string;
  summary?: string;
  colorId?: string;
  recurringEventId?: string;
  calendarId?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
  isPending?: boolean;
  showConfirmBanner?: boolean; // Only show confirm UI on this event
  pendingGroupId?: string; // Links recurring instances together
  isPendingDeletion?: boolean; // Event is marked for deletion
  showDeleteBanner?: boolean; // Only show delete UI banner on this event
  pendingDeletionInfo?: PendingDeletionInfo; // Deletion info
};

export type DetailedEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  attendees?: { email?: string; displayName?: string; responseStatus?: string }[];
  creator?: { email?: string; displayName?: string };
  organizer?: { email?: string; displayName?: string };
  recurrence?: string[];
  colorId?: string;
};

export type ColorDef = {
  background: string;
  foreground: string;
};

export type ColorsMap = Record<string, ColorDef>;

export type UserCalendar = {
  id: string;
  summary?: string;
  primary?: boolean;
  backgroundColor?: string | null;
  foregroundColor?: string | null;
  colorId?: string | null;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
};

export type PositionedEvent = {
  event: CalendarEvent;
  top: number;
  height: number;
  startMs: number;
  endMs: number;
  col: number;
  cols: number;
  leftPercent: number;
  widthPercent: number;
};

export type CalendarLegendEntry = {
  id: string;
  name: string;
  swatch: string;
  isPrimary: boolean;
  isOwned: boolean;
  accessRole?: string;
};

export type ColorOption = {
  id: string;
  background: string;
  name: string;
};

export const COLOR_OPTIONS: ColorOption[] = [
  { id: "1", background: "#7986cb", name: "Lavender" },
  { id: "2", background: "#33b679", name: "Sage" },
  { id: "3", background: "#8e24aa", name: "Grape" },
  { id: "4", background: "#e67c73", name: "Flamingo" },
  { id: "5", background: "#f6bf26", name: "Banana" },
  { id: "6", background: "#f4511e", name: "Tangerine" },
  { id: "7", background: "#039be5", name: "Peacock" },
  { id: "8", background: "#616161", name: "Graphite" },
  { id: "9", background: "#3f51b5", name: "Blueberry" },
  { id: "10", background: "#0b8043", name: "Basil" },
  { id: "11", background: "#d50000", name: "Tomato" },
];

export const HOUR_HEIGHT = 56;
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const STORAGE_KEY = "docket:selectedCalendars";

export const DEFAULT_COLOR: ColorDef = {
  background: "#039be5",
  foreground: "#ffffff",
};

export const PENDING_COLOR: ColorDef = {
  background: "#6366f1",
  foreground: "#ffffff",
};
