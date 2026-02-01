import { z } from "zod";
import { isValidIsoString } from "./openai";

export type CalendarToolArgs = {
  timeMin?: string;
  timeMax?: string;
  summary?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  recurrence?: string[];
  eventId?: string;
  calendarId?: string;
  attendees?: Array<{ email: string; displayName?: string; optional?: boolean }>;
  reminders?: Array<{ minutesBeforeStart: number; method?: string }>;
  colorId?: string;
  transparency?: string;
  visibility?: string;
  query?: string;
};

const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const isoDateTimeStrict = z
  .string()
  .refine((v) => isValidIsoString(v), { message: "Invalid ISO 8601 datetime" });

const isoDateOrDateTime = z
  .string()
  .refine(
    (v) => isValidIsoString(v) || isoDateOnlyPattern.test(v),
    { message: "Invalid ISO 8601 date or datetime" }
  );

const attendeeSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  optional: z.boolean().optional(),
});

const reminderSchema = z.object({
  minutesBeforeStart: z.number().int().nonnegative(),
  method: z.string().optional(),
});

export const listEventsSchema = z.object({
  timeMin: isoDateOrDateTime.optional(),
  timeMax: isoDateOrDateTime.optional(),
  calendarId: z.string().optional(),
  query: z.string().optional(),
});

export const proposeEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: isoDateTimeStrict,
  endDateTime: isoDateTimeStrict,
  timeZone: z.string().min(1),
  recurrence: z.array(z.string()).optional(),
  calendarId: z.string().optional(),
  attendees: z.array(attendeeSchema).optional(),
  reminders: z.array(reminderSchema).optional(),
  colorId: z.string().optional(),
  transparency: z.enum(["opaque", "transparent"]).optional(),
  visibility: z.enum(["default", "public", "private"]).optional(),
  query: z.string().optional(),
});

export const updateEventSchema = z.object({
  eventId: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: isoDateTimeStrict.optional(),
  endDateTime: isoDateTimeStrict.optional(),
  timeZone: z.string().optional(),
  recurrence: z.array(z.string()).optional(),
  calendarId: z.string().optional(),
  attendees: z.array(attendeeSchema).optional(),
  reminders: z.array(reminderSchema).optional(),
  colorId: z.string().optional(),
  transparency: z.enum(["opaque", "transparent"]).optional(),
  visibility: z.enum(["default", "public", "private"]).optional(),
  query: z.string().optional(),
});

export const proposeDeleteSchema = z.object({
  eventId: z.string().min(1),
  summary: z.string().min(1),
  startDateTime: isoDateOrDateTime,
  endDateTime: isoDateOrDateTime,
  calendarId: z.string().optional(),
  scope: z.enum(["this", "all"]).optional(),
  seriesEventId: z.string().optional(), // recurring event master id
});

export const deleteEventSchema = z.object({
  eventId: z.string().min(1),
  calendarId: z.string().optional(),
  scope: z.enum(["this", "all"]).optional(),
  seriesEventId: z.string().optional(),
});

export const cancelPendingSchema = z.object({});

const toolSchemas: Record<string, z.ZodTypeAny | undefined> = {
  list_events: listEventsSchema,
  propose_event: proposeEventSchema,
  update_event: updateEventSchema,
  propose_delete_event: proposeDeleteSchema,
  delete_event: deleteEventSchema,
  cancel_pending_events: cancelPendingSchema,
  cancel_pending_deletions: cancelPendingSchema,
};

export function validateToolArgs(toolName: string, args: unknown): CalendarToolArgs {
  const schema = toolSchemas[toolName];
  if (!schema) return (args as CalendarToolArgs) ?? {};
  return schema.parse(args) as CalendarToolArgs;
}
