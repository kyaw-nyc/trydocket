// Inject a simple floating button into Google Calendar to show a stub panel
(function () {
  if (window.__docketInjected) return;
  window.__docketInjected = true;

  const root = document.createElement("div");
  root.id = "docket-extension-root";
  document.body.appendChild(root);

  const style = document.createElement("style");
  style.textContent = `
    #docket-extension-root {
      position: fixed;
      bottom: 16px;
      right: 32px;
      z-index: 99999;
      font-family: sans-serif;
    }
    #docket-extension-button {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #1a73e8, #185abc);
      color: white;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    #docket-extension-panel {
      display: none;
      position: absolute;
      bottom: 60px;
      right: 0;
      width: 340px;
      max-height: 480px;
      background: white;
      color: #202124;
      border-radius: 12px;
      box-shadow: 0 14px 40px rgba(0,0,0,0.25);
      padding: 12px;
      overflow: auto;
    }
    #docket-extension-panel.dark {
      background: #1f1f22;
      color: #f1f3f4;
    }
    #docket-extension-close {
      position: absolute;
      top: 8px;
      right: 10px;
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 16px;
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "docket-extension-button";
  button.textContent = "D";

  const panel = document.createElement("div");
  panel.id = "docket-extension-panel";
  panel.innerHTML = `
    <button id="docket-extension-close" aria-label="Close">✕</button>
    <h3 style="margin:0 0 8px 0; font-size:16px;">Docket</h3>
    <p style="margin:0; font-size:13px; line-height:1.4;">Sign in, preview events, then confirm to add.</p>
    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
      <button id="docket-login" style="padding:8px 10px; border:1px solid #dadce0; border-radius:8px; background:#fff; cursor:pointer;">Sign in</button>
    </div>
    <div id="docket-pending" style="margin-top:10px; padding:8px; border-radius:8px; background:#f0f9eb; color:#145a32; display:none;">
      <div style="font-weight:600;">Pending event(s) ready to add.</div>
      <div id="docket-pending-count" style="font-size:12px;"></div>
      <div style="margin-top:6px; display:flex; gap:8px;">
        <button id="docket-confirm" style="padding:6px 10px; border:none; border-radius:6px; background:#34a853; color:white; cursor:pointer;">Confirm & Add</button>
        <button id="docket-clear" style="padding:6px 10px; border:1px solid #dadce0; border-radius:6px; background:#fff; cursor:pointer;">Clear</button>
      </div>
    </div>
    <div style="margin-top:10px;">
      <textarea id="docket-input" placeholder="e.g., \"Add team sync tomorrow 3-4pm\"" style="width:100%; height:80px; padding:8px; border:1px solid #dadce0; border-radius:8px; font-size:13px;"></textarea>
      <button id="docket-add" style="margin-top:6px; padding:8px 10px; border:none; border-radius:8px; background:#1a73e8; color:white; cursor:pointer;">Preview Add</button>
    </div>
    <pre id="docket-status" style="margin-top:12px; max-height:120px; overflow:auto; font-size:12px; background:#f8f9fa; padding:8px; border-radius:8px;"></pre>
    <div id="docket-chat" style="margin-top:12px;">
      <div id="docket-messages" style="max-height:220px; overflow:auto; border:1px solid #dadce0; border-radius:8px; padding:8px; background:#fafafa; font-size:13px;"></div>
      <textarea id="docket-chat-input" placeholder="Ask Docket about your calendar..." style="width:100%; height:60px; margin-top:6px; padding:8px; border:1px solid #dadce0; border-radius:8px; font-size:13px;"></textarea>
      <button id="docket-chat-send" style="margin-top:6px; padding:8px 10px; border:none; border-radius:8px; background:#1a73e8; color:white; cursor:pointer;">Send</button>
    </div>
  `;

  button.addEventListener("click", () => {
    const showing = panel.style.display === "block";
    panel.style.display = showing ? "none" : "block";
  });
  panel.querySelector("#docket-extension-close").addEventListener("click", () => {
    panel.style.display = "none";
  });

  root.appendChild(button);
  root.appendChild(panel);

  const status = panel.querySelector("#docket-status");
  const setStatus = (msg) => (status.textContent = msg);
  setStatus("Ready. Click Sign in to authenticate.");

  const send = (type, payload = {}) =>
    new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...payload }, (res) => resolve(res));
    });

  const msgBox = panel.querySelector("#docket-messages");
  let chatHistory = [];

  function renderMessages() {
    msgBox.innerHTML = chatHistory
      .map((m) => {
        const isUser = m.role === "user";
        return `<div style="display:flex; justify-content:${isUser ? "flex-end" : "flex-start"}; margin-bottom:6px;">
          <div style="max-width:85%; padding:10px 12px; border-radius:12px; ${
            isUser
              ? "background:#1a73e8; color:white; border:1px solid #165ec2;"
              : "background:#fff; color:#202124; border:1px solid #e0e0e0;"
          }">${m.content}</div>
        </div>`;
      })
      .join("");
    msgBox.scrollTop = msgBox.scrollHeight;
  }

  async function refreshPendingBanner() {
    const res = await send("pending_list");
    const box = panel.querySelector("#docket-pending");
    const countEl = panel.querySelector("#docket-pending-count");
    if (res.ok && res.pendingEvents && res.pendingEvents.length) {
      box.style.display = "block";
      countEl.textContent = `${res.pendingEvents.length} pending`;
    } else {
      box.style.display = "none";
    }
  }

  panel.querySelector("#docket-login").addEventListener("click", async () => {
    setStatus("Authenticating...");
    const res = await send("login");
    setStatus(res.ok ? "Signed in" : JSON.stringify(res, null, 2));
    if (res.ok) {
      refreshPendingBanner();
    }
  });

  panel.querySelector("#docket-add").addEventListener("click", async () => {
    const input = panel.querySelector("#docket-input").value.trim();
    if (!input) {
      setStatus("Type a title first.");
      return;
    }
    // Simple placeholder: schedule 1-hour event starting next top of hour
    const start = new Date();
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const pending = {
      summary: input,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
    };
    const res = await send("propose_event", { pending });
    if (res.ok) {
      setStatus(`Proposed "${input}". Pending preview ready.`);
      await refreshPendingBanner();
    } else {
      setStatus(res.error || "Failed to propose event");
    }
  });

  panel.querySelector("#docket-confirm").addEventListener("click", async () => {
    setStatus("Adding events...");
    const res = await send("pending_confirm");
    setStatus(res.ok ? "Added to Google Calendar" : res.error || "Failed to add");
    await refreshPendingBanner();
    loadUpcoming();
  });

  panel.querySelector("#docket-clear").addEventListener("click", async () => {
    await send("pending_clear");
    setStatus("Cleared pending.");
    refreshPendingBanner();
  });

  // initial pending check
  refreshPendingBanner();

  panel.querySelector("#docket-chat-send").addEventListener("click", async () => {
    const inputEl = panel.querySelector("#docket-chat-input");
    const content = inputEl.value.trim();
    if (!content) return;
    chatHistory.push({ role: "user", content });
    renderMessages();
    inputEl.value = "";
    setStatus("Thinking...");
    const res = await send("chat", { messages: chatHistory });
    if (res.ok) {
      chatHistory.push({ role: "assistant", content: res.content });
      renderMessages();
      setStatus("Ready");
    } else {
      setStatus(res.error || "Chat failed");
    }
  });
})();
