// Copy this file to config.js and fill in your values

// Google OAuth Client ID (from Google Cloud Console)
// 1. Go to https://console.cloud.google.com/
// 2. Create a project or select existing
// 3. Enable the Google Calendar API
// 4. Create OAuth 2.0 credentials (Chrome Extension type)
// 5. Add your extension ID to authorized origins
export const GOOGLE_CLIENT_ID = "your-client-id.apps.googleusercontent.com";

// Google API Scopes
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// OpenAI API Key
// Get yours at https://platform.openai.com/api-keys
export const OPENAI_API_KEY = "sk-your-key-here";

// OpenAI Model (optional, defaults to gpt-4o-mini)
export const OPENAI_MODEL = "gpt-4o-mini";
