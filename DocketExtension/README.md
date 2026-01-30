# Docket Extension

A Chrome extension that adds an AI-powered calendar assistant directly to Google Calendar. Chat with Docket to manage your schedule, and see proposed events previewed directly on your calendar before confirming.

## Features

- **Chat Interface**: A sleek chat popup that appears on Google Calendar
- **AI-Powered**: Uses OpenAI to understand natural language requests
- **Calendar Integration**: Directly reads and writes to your Google Calendar
- **Visual Previews**: Proposed events are injected into the calendar grid with action banners
- **Smart Positioning**: Action banners appear on the left or right based on the day column

## Setup

### 1. Configure API Keys

Copy `src/config.example.js` to `src/config.js` and fill in your values:

```javascript
export const GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
export const OPENAI_API_KEY = "sk-your-openai-key";
export const OPENAI_MODEL = "gpt-4o-mini";
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Calendar API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**
6. Select **Chrome Extension** as the application type
7. Enter your extension ID (you'll get this after loading the extension)
8. Copy the Client ID to your config.js

### 3. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `DocketExtension` folder
5. Note your extension ID and add it to Google Cloud Console

### 4. Authorize

1. Go to [Google Calendar](https://calendar.google.com)
2. Click the Docket chat button (bottom right)
3. Send a message - you'll be prompted to sign in with Google

## Usage

Click the chat button on Google Calendar to open Docket. Try commands like:

- "What's on my schedule today?"
- "Add a meeting tomorrow at 3pm for 1 hour"
- "Schedule 30 minutes of reading time"
- "What do I have next week?"

When Docket proposes an event:
1. The chat closes automatically
2. A preview appears on your calendar with a purple gradient
3. An action banner lets you **Add** or **Cancel**
4. Clicking Add creates the event and refreshes the page

## File Structure

```
DocketExtension/
├── manifest.json        # Extension manifest
├── src/
│   ├── background.js    # Service worker (API calls, AI chat)
│   ├── content.js       # Injected UI (chat, calendar previews)
│   ├── config.js        # Your API keys (not committed)
│   ├── config.example.js
│   ├── popup.html       # Extension popup (minimal)
│   ├── popup.js
│   └── styles.css
├── icon16.png
├── icon48.png
└── icon128.png
```

## Development

The extension uses vanilla JavaScript for maximum compatibility and minimal build complexity. All styles are injected dynamically to avoid conflicts with Google Calendar's CSS.

Key injection points in Google Calendar:
- Day columns: `[role="gridcell"][data-datekey="XXXXX"] .feMFof`
- Events are positioned using Google's ~48px per hour scale
- The `data-datekey` is days since Unix epoch (Jan 1, 1970)

## Troubleshooting

**Events not appearing on calendar:**
- Make sure the proposed event date is visible in the current week view
- Check the console for injection errors

**Auth not working:**
- Verify your Google Cloud OAuth client ID is correct
- Make sure the extension ID is added to authorized origins

**Chat not responding:**
- Check that your OpenAI API key is valid and has credits
- Check the service worker console for errors
