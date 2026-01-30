import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, OPENAI_API_KEY, OPENAI_MODEL } from "./config.js";

const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

// ============================================
// GOOGLE AUTH
// ============================================
async function launchAuth() {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  authUrl.searchParams.set("prompt", "consent");

  const resultUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  const parsed = new URL(resultUrl);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const accessToken = hash.get("access_token");
  const expiresIn = Number(hash.get("expires_in") || "0");
  if (!accessToken) throw new Error("No access token returned");
  const expiresAt = Date.now() + expiresIn * 1000 - 60 * 1000;
  await chrome.storage.local.set({ accessToken, expiresAt });
  return { accessToken, expiresAt };
}

async function getValidToken() {
  const { accessToken, expiresAt } = (await chrome.storage.local.get(["accessToken", "expiresAt"])) || {};
  if (accessToken && expiresAt && Date.now() < expiresAt) {
    return accessToken;
  }
  return (await launchAuth()).accessToken;
}

// ============================================
// GOOGLE CALENDAR API
// ============================================
async function fetchCalendars() {
  const token = await getValidToken();
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Calendar list failed: ${res.status}`);
  return res.json();
}

async function fetchUpcomingEvents(days = 7) {
  const token = await getValidToken();
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  return res.json();
}

async function fetchEventsInRange(timeMin, timeMax) {
  const token = await getValidToken();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  return res.json();
}

async function insertEvent(pending) {
  const token = await getValidToken();
  const body = {
    summary: pending.summary,
    location: pending.location,
    description: pending.description,
    start: { dateTime: pending.startDateTime, timeZone: pending.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: pending.endDateTime, timeZone: pending.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone },
  };
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Insert failed: ${res.status}`);
  return res.json();
}

// ============================================
// PENDING EVENTS STORAGE
// ============================================
async function getPending() {
  const { pendingEvents } = await chrome.storage.local.get("pendingEvents");
  return pendingEvents || [];
}

async function setPending(list) {
  await chrome.storage.local.set({ pendingEvents: list });
  return list;
}

// ============================================
// AI CHAT WITH TOOLS
// ============================================
function getSystemPrompt(currentTime, userTimezone) {
  return `You are Docket, an intelligent and friendly calendar assistant. You help users manage their Google Calendar efficiently.

## Current Context
- Current date/time: ${currentTime}
- User's timezone: ${userTimezone}

## Core Capabilities

### Listing Events
Use the list_events function to show the user their schedule.

### Creating Events
When the user wants to create/add/schedule an event:
1. FIRST, use list_events to check for conflicts during the proposed time
2. Use the propose_event function to suggest an event (NOT create_event directly)
3. The user must confirm before it's added to Google Calendar
4. Always round times to the nearest 5-minute mark

When a user says something like "Put 1 hour of reading", infer the start time as NOW (rounded to nearest 5 min).

## Response Style
- Be concise but helpful
- When proposing events, confirm the details clearly
- If there are conflicts, mention them before proposing`;
}

const tools = [
  {
    type: "function",
    function: {
      name: "list_events",
      description: "List calendar events in a time range",
      parameters: {
        type: "object",
        properties: {
          timeMin: { type: "string", description: "Start of range (ISO 8601)" },
          timeMax: { type: "string", description: "End of range (ISO 8601)" },
        },
        required: ["timeMin", "timeMax"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_event",
      description: "Propose a new calendar event for user confirmation",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Event title" },
          startDateTime: { type: "string", description: "Start time (ISO 8601)" },
          endDateTime: { type: "string", description: "End time (ISO 8601)" },
          description: { type: "string", description: "Event description (optional)" },
          location: { type: "string", description: "Event location (optional)" },
        },
        required: ["summary", "startDateTime", "endDateTime"],
      },
    },
  },
];

async function executeToolCall(toolName, args) {
  switch (toolName) {
    case "list_events": {
      try {
        const data = await fetchEventsInRange(args.timeMin, args.timeMax);
        const events = (data.items || []).map((e) => ({
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          location: e.location,
        }));
        return JSON.stringify({ events });
      } catch (err) {
        return JSON.stringify({ error: err.message });
      }
    }
    case "propose_event": {
      // Don't actually create - just return the proposal for confirmation
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const pendingEvent = {
        id: `pending-${Date.now()}`,
        summary: args.summary,
        startDateTime: args.startDateTime,
        endDateTime: args.endDateTime,
        description: args.description || "",
        location: args.location || "",
        timeZone: timezone,
      };

      // Store as pending
      const current = await getPending();
      current.push(pendingEvent);
      await setPending(current);

      return JSON.stringify({
        status: "proposed",
        message: "Event proposed. User will see a preview and can confirm.",
        event: pendingEvent,
      });
    }
    default:
      return JSON.stringify({ error: "Unknown function" });
  }
}

async function chatWithAI(messages, timezone) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("sk-your-key")) {
    throw new Error("OPENAI_API_KEY not set in config.js");
  }

  const currentTime = new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const systemMessage = {
    role: "system",
    content: getSystemPrompt(currentTime, timezone),
  };

  let conversationMessages = [systemMessage, ...messages];
  let pendingEventsFromChat = [];

  // Loop to handle tool calls
  for (let i = 0; i < 5; i++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL || "gpt-4o-mini",
        messages: conversationMessages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const choice = json.choices?.[0];
    const assistantMessage = choice?.message;

    if (!assistantMessage) {
      throw new Error("No response from AI");
    }

    // Check for tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      conversationMessages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const funcName = toolCall.function.name;
        const funcArgs = JSON.parse(toolCall.function.arguments || "{}");

        const result = await executeToolCall(funcName, funcArgs);

        // If this was a propose_event, track the pending event
        if (funcName === "propose_event") {
          const parsed = JSON.parse(result);
          if (parsed.event) {
            pendingEventsFromChat.push(parsed.event);
          }
        }

        conversationMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      // Continue loop to get final response
      continue;
    }

    // No tool calls - we have the final response
    return {
      content: assistantMessage.content || "",
      pendingEvents: pendingEventsFromChat,
    };
  }

  throw new Error("Too many tool call iterations");
}

// ============================================
// MESSAGE HANDLER
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "ping":
        sendResponse({ pong: true });
        return;

      case "login":
        try {
          const token = await getValidToken();
          sendResponse({ ok: true, token });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || "auth_failed" });
        }
        return;

      case "calendars":
        try {
          const data = await fetchCalendars();
          sendResponse({ ok: true, data });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || "fetch_failed" });
        }
        return;

      case "events":
        try {
          const data = await fetchUpcomingEvents(message.days || 7);
          sendResponse({ ok: true, data });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || "fetch_failed" });
        }
        return;

      case "propose_event": {
        const pending = message.pending;
        if (!pending?.summary || !pending?.startDateTime || !pending?.endDateTime) {
          sendResponse({ ok: false, error: "missing_fields" });
          return;
        }
        const current = await getPending();
        current.push({ id: `pending-${Date.now()}`, ...pending });
        await setPending(current);
        sendResponse({ ok: true, pendingEvents: current });
        return;
      }

      case "pending_list": {
        const list = await getPending();
        sendResponse({ ok: true, pendingEvents: list });
        return;
      }

      case "pending_clear": {
        await setPending([]);
        sendResponse({ ok: true, pendingEvents: [] });
        return;
      }

      case "pending_confirm": {
        const list = await getPending();
        try {
          const results = [];
          for (const p of list) {
            const ev = await insertEvent(p);
            results.push(ev);
          }
          await setPending([]);
          sendResponse({ ok: true, created: results });
        } catch (err) {
          sendResponse({ ok: false, error: err?.message || "insert_failed" });
        }
        return;
      }

      case "chat": {
        try {
          const timezone = message.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
          const result = await chatWithAI(message.messages, timezone);
          sendResponse({
            ok: true,
            content: result.content,
            pendingEvents: result.pendingEvents,
          });
        } catch (err) {
          console.error("Chat error:", err);
          sendResponse({ ok: false, error: err?.message || "chat_failed" });
        }
        return;
      }

      default:
        sendResponse({ ok: false, error: "unknown_message" });
    }
  })();
  return true; // keep channel open for async
});
