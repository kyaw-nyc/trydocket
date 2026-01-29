import { google } from "googleapis";

function getCalendar(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function listEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string,
  calendarId = "primary"
) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax:
      timeMax ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });
  const items = res.data.items || [];
  // Tag events with their source calendar for downstream filtering/labeling
  items.forEach((item) => {
    (item as { calendarId?: string }).calendarId = calendarId;
  });
  return items;
}

export async function getColors(accessToken: string) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.colors.get();
  return res.data;
}

export async function getCalendarMetadata(accessToken: string) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.calendarList.get({ calendarId: "primary" });
  return res.data;
}

export async function listCalendars(accessToken: string) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.calendarList.list({
    maxResults: 250,
    showDeleted: false,
    showHidden: false,
  });
  return res.data.items || [];
}

export async function createEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    recurrence?: string[];
  }
) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });
  return res.data;
}

export async function updateEvent(
  accessToken: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    location?: string;
    colorId?: string;
    start?: { dateTime: string; timeZone?: string };
    end?: { dateTime: string; timeZone?: string };
  }
) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: updates,
  });
  return res.data;
}

export async function deleteEvent(accessToken: string, eventId: string) {
  const calendar = getCalendar(accessToken);
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  });
  return { success: true };
}

export async function getEvent(
  accessToken: string,
  eventId: string,
  calendarId = "primary"
) {
  const calendar = getCalendar(accessToken);
  const res = await calendar.events.get({
    calendarId,
    eventId,
  });
  return res.data;
}
