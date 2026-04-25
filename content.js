let enabled = false;

function setReactValue(el, value) {
  const newValue = String(value ?? "");

  // ChatGPT input is sometimes a <textarea> and sometimes a contenteditable element.
  // Handle both so prompt actually updates visually.
  el.focus?.();

  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    const setter = desc && desc.set;
    if (setter) setter.call(el, newValue);
    else el.value = newValue;

    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (el.isContentEditable) {
    // Replace content without execCommand; keep it simple and then fire an input event.
    el.textContent = newValue;
    try {
      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: newValue,
        })
      );
    } catch {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }

  // Fallback
  try {
    el.value = newValue;
  } catch {}
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Apply current `enabled` state to ChatGPT UI elements and the widget
function applyState() {
  const el = document.querySelector("#prompt-textarea");
  const sendButton = document.querySelector('button[data-testid="send-button"]');
  const icon = document.querySelector("button");

  if (el) el.classList.toggle("green-mode", enabled);
  if (icon) icon.style.backgroundColor = enabled ? "#3b9c4a" : "";
  if (sendButton) sendButton.style.backgroundColor = enabled ? "green" : "";

  const widgetToggle = document.getElementById("eco-widget-toggle");
  const widgetStatus = document.getElementById("eco-widget-status");
  if (widgetToggle) widgetToggle.checked = enabled;
  if (widgetStatus) {
    widgetStatus.textContent = enabled ? "Active" : "Inactive";
    widgetStatus.className = "eco-status" + (enabled ? " active" : "");
  }
}

function updateWidgetStatus(message, stats) {
  const widgetStatus = document.getElementById("eco-widget-status");
  if (!widgetStatus) return;
  // If stats provided, show water-saved message + store totals
  if (stats && typeof stats.savedMl === "number") {
    widgetStatus.textContent = `${formatMl(stats.savedMl)} of water reduced in this prompt`;
    widgetStatus.className = "eco-status active";
    if (stats.savedMl > 0) {
      chrome.storage.local.get("totalWaterSavedMl", ({ totalWaterSavedMl }) => {
        const newTotal =
          Math.round(((totalWaterSavedMl || 0) + stats.savedMl) * 10000) / 10000;
        chrome.storage.local.set({
          totalWaterSavedMl: newTotal,
          lastPromptSavedMl: stats.savedMl,
        });
      });
    }
    return;
  }
  // Fallback: just show the message
  widgetStatus.textContent = message;
  widgetStatus.className = "eco-status active";
}

// Capture-phase keydown — runs before ChatGPT's handler
document.addEventListener("keydown", (e) => {
  if (!enabled) return;
  if (e.key !== "Enter" || e.shiftKey) return;
  const el = document.querySelector("#prompt-textarea");
  if (!el) return;
  const prompt = el.value || el.innerText;
  const improved = reduceAmbiguity(prompt);
  setReactValue(el, improved);
  updateWidgetStatus("Prompt optimized");
  try { countChar(prompt); } catch {}
}, true);

// Capture-phase click on the send button
document.addEventListener("click", (e) => {
  if (!enabled) return;
  if (!e.target.closest('button[data-testid="send-button"]')) return;
  const el = document.querySelector("#prompt-textarea");
  if (!el) return;
  const prompt = el.value || el.innerText;
  const improved = reduceAmbiguity(prompt);
  setReactValue(el, improved);
  updateWidgetStatus("Prompt optimized");
  try { countChar(prompt); } catch {}
}, true);

function injectWidget() {
  if (document.getElementById("eco-floating-widget")) return;

  const style = document.createElement("style");
  style.textContent = `
    #eco-floating-widget {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 220px;
      background: #0d1f13;
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 16px;
      padding: 14px 16px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(34, 197, 94, 0.12), 0 2px 8px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      animation: eco-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes eco-in {
      from { opacity: 0; transform: translateY(16px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    #eco-floating-widget .eco-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    #eco-floating-widget .eco-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #22c55e;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    #eco-floating-widget .eco-close {
      all: unset;
      cursor: pointer;
      color: #4b7a5a;
      font-size: 13px;
      line-height: 1;
      padding: 3px 5px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    #eco-floating-widget .eco-close:hover {
      color: #d1fae5;
      background: #1a3a22;
    }
    #eco-floating-widget .eco-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #eco-floating-widget .eco-label {
      color: #a7f3d0;
      font-size: 13px;
    }
    #eco-floating-widget .eco-switch {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }
    #eco-floating-widget .eco-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    #eco-floating-widget .eco-slider {
      position: absolute;
      inset: 0;
      background: #2d3b32;
      border-radius: 22px;
      cursor: pointer;
      transition: background 0.2s;
    }
    #eco-floating-widget .eco-slider::before {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      left: 3px;
      top: 3px;
      background: #6b7280;
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }
    #eco-floating-widget .eco-switch input:checked + .eco-slider {
      background: #16532d;
    }
    #eco-floating-widget .eco-switch input:checked + .eco-slider::before {
      transform: translateX(18px);
      background: #22c55e;
    }
    #eco-floating-widget .eco-status {
      margin-top: 10px;
      font-size: 11px;
      color: #4b5563;
      text-align: center;
      letter-spacing: 0.3px;
    }
    #eco-floating-widget .eco-status.active {
      color: #22c55e;
    }
  `;
  document.head.appendChild(style);

  const widget = document.createElement("div");
  widget.id = "eco-floating-widget";
  widget.innerHTML = `
    <div class="eco-header">
      <div class="eco-title">
        <span>🌿</span>
        <span>Eco Mode</span>
      </div>
      <button class="eco-close" id="eco-close-btn" title="Close">✕</button>
    </div>
    <div class="eco-row">
      <span class="eco-label">Green Mode</span>
      <label class="eco-switch">
        <input type="checkbox" id="eco-widget-toggle">
        <span class="eco-slider"></span>
      </label>
    </div>
    <p class="eco-status" id="eco-widget-status">Inactive</p>
  `;
  document.body.appendChild(widget);

  document.getElementById("eco-close-btn").addEventListener("click", () => {
    widget.remove();
  });

  document.getElementById("eco-widget-toggle").addEventListener("change", (e) => {
    enabled = e.target.checked;
    applyState();
    chrome.storage.local.set({ ecoEnabled: enabled });
  });
}

// Sync state when popup (or another tab) changes storage
chrome.storage.onChanged.addListener((changes) => {
  if ("ecoEnabled" in changes) {
    enabled = changes.ecoEnabled.newValue;
    applyState();
  }
});

// Init: read persisted state then inject widget
chrome.storage.local.get("ecoEnabled", ({ ecoEnabled }) => {
  enabled = !!ecoEnabled;
  injectWidget();
  applyState();
});

console.log("content script loaded");


// testing 