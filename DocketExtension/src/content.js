// Docket Extension - Content Script
// Injects a chat interface and pending event previews into Google Calendar

(function () {
  if (window.__docketInjected) return;
  window.__docketInjected = true;

  // ============================================
  // STATE
  // ============================================
  let isOpen = false;
  let messages = [];
  let pendingEvents = [];
  let isLoading = false;
  let isConfirming = false;
  let injectedEventElements = [];

  // ============================================
  // UTILITIES
  // ============================================
  const send = (type, payload = {}) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...payload }, (res) => resolve(res));
    });

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "America/New_York";
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatTimeRange = (start, end) => {
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  // Convert date to Google Calendar's datekey format
  // Google Calendar uses an epoch of approximately December 30, 1899 (like Excel)
  const getDateKey = (date) => {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // Use noon to avoid timezone issues
    // Google Calendar epoch: calculate based on known reference
    // Jan 30, 2026 = datekey 28734
    // So epoch = Jan 30, 2026 - 28734 days
    const refDate = new Date(2026, 0, 30, 12, 0, 0); // Jan 30, 2026
    const refKey = 28734;
    const daysDiff = Math.floor((d - refDate) / (24 * 60 * 60 * 1000));
    return refKey + daysDiff;
  };

  // Find the day column for a given date by matching datekey or date
  const findDayColumn = (eventDate) => {
    const targetKey = getDateKey(eventDate);
    console.log("[Docket] Looking for datekey:", targetKey, "for date:", eventDate);

    // Method 1: Try to find by datekey
    let dayColumn = document.querySelector(
      `[role="gridcell"][data-datekey="${targetKey}"] .feMFof`
    );

    if (dayColumn) {
      console.log("[Docket] Found column by datekey");
      return dayColumn;
    }

    // Method 2: Try to find by column index based on day of week
    const eventDay = new Date(eventDate);
    const dayOfWeek = eventDay.getDay(); // 0 = Sunday

    // Find all day columns
    const allColumns = document.querySelectorAll('[role="gridcell"][data-column-index] .feMFof');
    console.log("[Docket] Found", allColumns.length, "columns, trying column index", dayOfWeek);

    if (allColumns.length > 0 && dayOfWeek < allColumns.length) {
      dayColumn = allColumns[dayOfWeek];
      if (dayColumn) {
        console.log("[Docket] Found column by day of week index");
        return dayColumn;
      }
    }

    // Method 3: Search all gridcells and match by aria-label date
    const gridcells = document.querySelectorAll('[role="gridcell"][data-datekey]');
    const targetDateStr = eventDay.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    console.log("[Docket] Searching by aria-label for:", targetDateStr);

    for (const cell of gridcells) {
      const label = cell.getAttribute('aria-labelledby');
      if (label) {
        const labelEl = document.getElementById(label);
        if (labelEl && labelEl.textContent.includes(eventDay.getDate().toString())) {
          dayColumn = cell.querySelector('.feMFof');
          if (dayColumn) {
            console.log("[Docket] Found column by aria-label search");
            return dayColumn;
          }
        }
      }
    }

    console.log("[Docket] Could not find day column for date:", eventDate);
    return null;
  };

  // Get day of week (0 = Sunday)
  const getDayOfWeek = (dateStr) => {
    return new Date(dateStr).getDay();
  };

  // Get column index (0-6) for positioning banner
  const getColumnIndex = (eventDate) => {
    const targetKey = getDateKey(eventDate);
    const cell = document.querySelector(`[role="gridcell"][data-datekey="${targetKey}"]`);
    if (cell) {
      const idx = cell.getAttribute('data-column-index');
      if (idx !== null) return parseInt(idx, 10);
    }
    // Fallback to day of week
    return new Date(eventDate).getDay();
  };

  // ============================================
  // INJECT STYLES
  // ============================================
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    /* Chat Button */
    #docket-chat-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background: #1a1a1a;
      color: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #docket-chat-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 24px rgba(0,0,0,0.4);
    }
    #docket-chat-btn svg {
      width: 24px;
      height: 24px;
    }
    #docket-chat-btn .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: white;
      color: #1a1a1a;
      font-size: 12px;
      font-weight: 700;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Chat Window */
    #docket-chat-window {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99998;
      width: 380px;
      height: 520px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.25);
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #docket-chat-window.open {
      display: flex;
    }

    /* Header */
    .docket-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid #e5e5e5;
    }
    .docket-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .docket-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #1a1a1a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .docket-avatar svg {
      width: 18px;
      height: 18px;
      color: white;
    }
    .docket-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .docket-subtitle {
      font-size: 12px;
      color: #666;
    }
    .docket-close-btn {
      background: none;
      border: none;
      padding: 8px;
      cursor: pointer;
      color: #666;
      border-radius: 8px;
    }
    .docket-close-btn:hover {
      background: #f5f5f5;
    }

    /* Messages Area */
    .docket-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Empty State */
    .docket-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
      color: #666;
    }
    .docket-empty-icon {
      width: 64px;
      height: 64px;
      background: #f5f5f5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .docket-empty-icon svg {
      width: 32px;
      height: 32px;
      color: #999;
    }
    .docket-empty-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .docket-empty-text {
      font-size: 12px;
      color: #666;
    }
    .docket-suggestions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .docket-suggestion {
      width: 100%;
      padding: 12px;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      background: white;
      text-align: left;
      font-size: 13px;
      color: #666;
      cursor: pointer;
      transition: background 0.2s;
    }
    .docket-suggestion:hover {
      background: #f5f5f5;
      color: #1a1a1a;
    }

    /* Message Bubbles */
    .docket-msg {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
    }
    .docket-msg.user {
      align-self: flex-end;
      background: #1a1a1a;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .docket-msg.assistant {
      align-self: flex-start;
      background: #f5f5f5;
      color: #1a1a1a;
      border-bottom-left-radius: 4px;
    }

    /* Loading Indicator */
    .docket-loading {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f5f5f5;
      border-radius: 16px;
      font-size: 14px;
      color: #666;
    }
    .docket-loading-dots {
      display: flex;
      gap: 4px;
    }
    .docket-loading-dots span {
      width: 6px;
      height: 6px;
      background: #999;
      border-radius: 50%;
      animation: docket-bounce 1.4s ease-in-out infinite;
    }
    .docket-loading-dots span:nth-child(1) { animation-delay: 0s; }
    .docket-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .docket-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes docket-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* Input Area */
    .docket-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      gap: 8px;
    }
    .docket-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    .docket-input:focus {
      border-color: #1a73e8;
    }
    .docket-send-btn {
      padding: 12px 16px;
      background: #1a1a1a;
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }
    .docket-send-btn:hover:not(:disabled) {
      background: #333;
    }
    .docket-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .docket-send-btn svg {
      width: 18px;
      height: 18px;
    }

    /* Injected Event in Google Calendar */
    .docket-injected-event {
      position: absolute;
      left: 2px;
      right: 2px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      color: white;
      cursor: default;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
      animation: docket-pulse 2s ease-in-out infinite;
      overflow: hidden;
    }
    @keyframes docket-pulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4); }
      50% { box-shadow: 0 2px 16px rgba(99, 102, 241, 0.6); }
    }
    .docket-injected-event .event-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .docket-injected-event .event-title {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .docket-injected-event .event-time {
      font-size: 11px;
      opacity: 0.9;
    }

    /* Action Banner */
    .docket-action-banner {
      position: absolute;
      z-index: 101;
      background: #1a1a1a;
      color: white;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 160px;
    }
    .docket-action-banner.left {
      right: calc(100% + 12px);
      top: 0;
    }
    .docket-action-banner.right {
      left: calc(100% + 12px);
      top: 0;
    }
    .docket-action-banner .banner-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .docket-action-banner .banner-title .dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: docket-pulse-dot 1.5s ease-in-out infinite;
    }
    @keyframes docket-pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .docket-action-banner .banner-actions {
      display: flex;
      gap: 8px;
    }
    .docket-action-banner button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: background 0.2s;
    }
    .docket-action-banner .cancel-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
    }
    .docket-action-banner .cancel-btn:hover {
      background: rgba(255,255,255,0.1);
    }
    .docket-action-banner .confirm-btn {
      background: #1a73e8;
      border: none;
      color: white;
    }
    .docket-action-banner .confirm-btn:hover {
      background: #1557b0;
    }
    .docket-action-banner .confirm-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    /* Arrow for banner */
    .docket-action-banner::after {
      content: '';
      position: absolute;
      top: 16px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
    }
    .docket-action-banner.left::after {
      left: 100%;
      border-left: 8px solid #1a1a1a;
    }
    .docket-action-banner.right::after {
      right: 100%;
      border-right: 8px solid #1a1a1a;
    }

    /* Spinner */
    .docket-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: docket-spin 0.8s linear infinite;
    }
    @keyframes docket-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);

  // ============================================
  // CREATE CHAT UI
  // ============================================
  const root = document.createElement("div");
  root.id = "docket-root";
  document.body.appendChild(root);

  // Chat Button
  const chatBtn = document.createElement("button");
  chatBtn.id = "docket-chat-btn";
  chatBtn.innerHTML = `
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <span class="badge" style="display: none;">0</span>
  `;
  root.appendChild(chatBtn);

  // Chat Window
  const chatWindow = document.createElement("div");
  chatWindow.id = "docket-chat-window";
  chatWindow.innerHTML = `
    <div class="docket-header">
      <div class="docket-header-left">
        <div class="docket-avatar">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div class="docket-title">Docket AI</div>
          <div class="docket-subtitle">Your calendar assistant</div>
        </div>
      </div>
      <button class="docket-close-btn">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
    <div class="docket-messages"></div>
    <div class="docket-input-area">
      <input type="text" class="docket-input" placeholder="Ask about your calendar..." />
      <button class="docket-send-btn">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  `;
  root.appendChild(chatWindow);

  const messagesContainer = chatWindow.querySelector(".docket-messages");
  const inputEl = chatWindow.querySelector(".docket-input");
  const sendBtn = chatWindow.querySelector(".docket-send-btn");
  const closeBtn = chatWindow.querySelector(".docket-close-btn");
  const badge = chatBtn.querySelector(".badge");

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  function renderMessages() {
    if (messages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="docket-empty">
          <div class="docket-empty-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="docket-empty-title">Hi! I'm Docket</div>
          <div class="docket-empty-text">I can help you manage your calendar.</div>
          <div class="docket-suggestions">
            <button class="docket-suggestion">"What's on my schedule today?"</button>
            <button class="docket-suggestion">"Add 1 hour of reading time"</button>
            <button class="docket-suggestion">"Schedule a meeting tomorrow at 3pm"</button>
          </div>
        </div>
      `;
      // Add suggestion click handlers
      messagesContainer.querySelectorAll(".docket-suggestion").forEach((btn) => {
        btn.addEventListener("click", () => {
          inputEl.value = btn.textContent.replace(/"/g, "");
          inputEl.focus();
        });
      });
      return;
    }

    let html = messages
      .map((m) => `<div class="docket-msg ${m.role}">${escapeHtml(m.content)}</div>`)
      .join("");

    if (isLoading) {
      html += `
        <div class="docket-loading">
          <div class="docket-loading-dots">
            <span></span><span></span><span></span>
          </div>
          Thinking...
        </div>
      `;
    }

    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function updateBadge() {
    if (pendingEvents.length > 0) {
      badge.style.display = "flex";
      badge.textContent = pendingEvents.length;
    } else {
      badge.style.display = "none";
    }
  }

  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    chatBtn.style.display = isOpen ? "none" : "flex";
    if (isOpen) {
      inputEl.focus();
    }
  }

  // ============================================
  // INJECT EVENTS INTO GOOGLE CALENDAR
  // ============================================
  function clearInjectedEvents() {
    injectedEventElements.forEach((el) => el.remove());
    injectedEventElements = [];
  }

  function injectPendingEvents() {
    clearInjectedEvents();

    console.log("[Docket] Injecting", pendingEvents.length, "pending events");

    pendingEvents.forEach((event, index) => {
      const startDate = new Date(event.startDateTime);
      const endDate = new Date(event.endDateTime);

      console.log("[Docket] Processing event:", event.summary, "at", event.startDateTime);

      // Find the day column in Google Calendar
      const dayColumn = findDayColumn(event.startDateTime);

      if (!dayColumn) {
        console.log("[Docket] Day column not found for event:", event.summary);
        return;
      }

      // Calculate position based on time
      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const endHour = endDate.getHours() + endDate.getMinutes() / 60;
      const duration = endHour - startHour;

      // Google Calendar uses ~48px per hour (approximate)
      const pxPerHour = 48;
      const top = startHour * pxPerHour;
      const height = Math.max(duration * pxPerHour, 24); // minimum height

      console.log("[Docket] Event position: top=", top, "height=", height);

      // Determine banner position based on column index
      const colIndex = getColumnIndex(event.startDateTime);
      const bannerPosition = colIndex <= 2 ? "right" : "left";
      console.log("[Docket] Column index:", colIndex, "Banner position:", bannerPosition);

      // Create wrapper for event + banner
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `position: absolute; top: ${top}px; left: 0; right: 0; z-index: 100;`;

      // Create the event element
      const eventEl = document.createElement("div");
      eventEl.className = "docket-injected-event";
      eventEl.style.cssText = `position: relative; height: ${height}px;`;
      eventEl.innerHTML = `
        <div class="event-badge">New</div>
        <div class="event-title">${escapeHtml(event.summary || "Untitled")}</div>
        ${height > 30 ? `<div class="event-time">${formatTimeRange(event.startDateTime, event.endDateTime)}</div>` : ""}
      `;

      // Create the action banner (only for the first pending event)
      if (index === 0) {
        const banner = document.createElement("div");
        banner.className = `docket-action-banner ${bannerPosition}`;
        banner.innerHTML = `
          <div class="banner-title">
            <span class="dot"></span>
            Add this event?
          </div>
          <div class="banner-actions">
            <button class="cancel-btn">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button class="confirm-btn">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Add
            </button>
          </div>
        `;

        banner.querySelector(".cancel-btn").addEventListener("click", handleClear);
        banner.querySelector(".confirm-btn").addEventListener("click", handleConfirm);

        eventEl.appendChild(banner);
      }

      wrapper.appendChild(eventEl);
      dayColumn.appendChild(wrapper);
      injectedEventElements.push(wrapper);
    });
  }

  // ============================================
  // API HANDLERS
  // ============================================
  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text || isLoading) return;

    const userMessage = { role: "user", content: text };
    messages.push(userMessage);
    inputEl.value = "";
    isLoading = true;
    renderMessages();

    try {
      const res = await send("chat", {
        messages: messages,
        timezone: getUserTimezone(),
      });

      if (res.ok) {
        messages.push({ role: "assistant", content: res.content });
        console.log("[Docket] Chat response received:", res);

        // Check for pending events in the response
        if (res.pendingEvents && res.pendingEvents.length > 0) {
          console.log("[Docket] Received pending events:", res.pendingEvents);
          pendingEvents = [...pendingEvents, ...res.pendingEvents];
          updateBadge();
          // Small delay to ensure Google Calendar DOM is ready
          setTimeout(() => {
            injectPendingEvents();
          }, 500);
          // Close chat so user can see the calendar
          if (isOpen) {
            toggleChat();
          }
        }
      } else {
        console.log("[Docket] Chat error:", res);
        messages.push({
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        });
      }
    } catch (err) {
      messages.push({
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      });
    } finally {
      isLoading = false;
      renderMessages();
    }
  }

  async function handleConfirm() {
    if (isConfirming || pendingEvents.length === 0) return;

    isConfirming = true;
    const confirmBtn = document.querySelector(".docket-action-banner .confirm-btn");
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<div class="docket-spinner"></div>';
    }

    try {
      const res = await send("pending_confirm");
      if (res.ok) {
        pendingEvents = [];
        updateBadge();
        clearInjectedEvents();
        // Reload the page to show the new event in Google Calendar
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (err) {
      console.error("Failed to confirm events:", err);
    } finally {
      isConfirming = false;
    }
  }

  async function handleClear() {
    await send("pending_clear");
    pendingEvents = [];
    updateBadge();
    clearInjectedEvents();
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  chatBtn.addEventListener("click", toggleChat);
  closeBtn.addEventListener("click", toggleChat);
  sendBtn.addEventListener("click", handleSend);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ============================================
  // INITIALIZE
  // ============================================
  async function init() {
    console.log("[Docket] Initializing...");

    // Check for existing pending events
    const res = await send("pending_list");
    console.log("[Docket] Pending events check:", res);

    if (res.ok && res.pendingEvents && res.pendingEvents.length > 0) {
      pendingEvents = res.pendingEvents;
      updateBadge();
      // Wait a bit for Google Calendar to fully load, then inject
      setTimeout(injectPendingEvents, 2000);
    }
    renderMessages();

    console.log("[Docket] Initialization complete");
  }

  // Test function - can be called from console: window.__docketTest()
  window.__docketTest = function() {
    console.log("[Docket] Running test injection...");

    // Create a test event for the current time
    const now = new Date();
    now.setMinutes(Math.round(now.getMinutes() / 5) * 5, 0, 0); // Round to 5 min
    const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

    const testEvent = {
      id: "test-" + Date.now(),
      summary: "Test Event from Docket",
      startDateTime: now.toISOString(),
      endDateTime: endTime.toISOString(),
      timeZone: getUserTimezone(),
    };

    console.log("[Docket] Test event:", testEvent);
    pendingEvents = [testEvent];
    updateBadge();
    injectPendingEvents();

    return "Test injection triggered. Check the calendar!";
  };

  // Debug function to list all datekeys on the page
  window.__docketDebug = function() {
    const cells = document.querySelectorAll('[role="gridcell"][data-datekey]');
    console.log("[Docket] Found", cells.length, "gridcells with datekeys:");
    cells.forEach(cell => {
      const dk = cell.getAttribute('data-datekey');
      const ci = cell.getAttribute('data-column-index');
      const feMFof = cell.querySelector('.feMFof');
      console.log("  datekey:", dk, "column-index:", ci, "has .feMFof:", !!feMFof);
    });
    return "Debug info logged to console";
  };

  // Wait for Google Calendar to load
  if (document.readyState === "complete") {
    init();
  } else {
    window.addEventListener("load", init);
  }

  // Re-inject events when Google Calendar navigates (watches for DOM changes)
  const observer = new MutationObserver(() => {
    if (pendingEvents.length > 0) {
      // Debounce the re-injection
      clearTimeout(window.__docketReinjectTimeout);
      window.__docketReinjectTimeout = setTimeout(injectPendingEvents, 500);
    }
  });

  // Observe the main calendar grid for changes
  setTimeout(() => {
    const calendarGrid = document.querySelector('[role="grid"]');
    if (calendarGrid) {
      observer.observe(calendarGrid, { childList: true, subtree: true });
    }
  }, 2000);
})();
