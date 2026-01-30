import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES, OPENAI_API_KEY, OPENAI_MODEL } from "./config.js";

const REDIRECT_URI = `https://${chrome.runtime.id}.chromiumapp.org/`;

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
  const expiresAt = Date.now() + expiresIn * 1000 - 60 * 1000; // refresh 1 min early
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

async function insertEvent(pending) {
  const token = await getValidToken();
  const body = {
    summary: pending.summary,
    location: pending.location,
    start: { dateTime: pending.startDateTime },
    end: { dateTime: pending.endDateTime },
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

async function getPending() {
  const { pendingEvents } = await chrome.storage.local.get("pendingEvents");
  return pendingEvents || [];
}

async function setPending(list) {
  await chrome.storage.local.set({ pendingEvents: list });
  return list;
}

async function chatWithOpenAI(messages) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.startsWith("sk-your-key")) {
    throw new Error("OPENAI_API_KEY not set in config.js");
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || "";
}

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
          const reply = await chatWithOpenAI(message.messages);
          sendResponse({ ok: true, content: reply });
        } catch (err) {
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
