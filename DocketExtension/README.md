# Docket Chrome Extension (starter)

## What this includes
- Manifest v3 targeting Google Calendar (`calendar.google.com`).
- Background service worker stub with a ping handler.
- Content script that injects a floating Docket button/panel into Google Calendar.
- Simple popup for manual tests (Chrome toolbar action).

## How to load in Chrome
1. Open `chrome://extensions` and toggle **Developer mode**.
2. Click **Load unpacked** and select the `DocketExtension` folder.
3. Open Google Calendar; you should see a floating "D" button bottom-right.

## Next steps
- Replace the content/popup UI with your chat experience (call your existing backend to keep API keys safe).
- Implement OAuth (via `chrome.identity.launchWebAuthFlow`) for Google Calendar; store tokens in `chrome.storage`.
- Move inline styles into `src/styles.css` if you expand the UI.
- Add icons (`icon16.png`, `icon48.png`, `icon128.png`).
