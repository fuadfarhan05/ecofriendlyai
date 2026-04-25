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
    widgetStatus.textContent = `${formatMl(stats.savedMl)} of water reduced in this prompt (${stats.savedPercent}%)`;
    widgetStatus.className = "eco-status active";
    chrome.storage.local.get(
      ["totalWaterSavedMl", "totalPrompts", "totalSavedPercent"],
      (d) => {
        chrome.storage.local.set({
          totalWaterSavedMl: Math.round(((d.totalWaterSavedMl || 0) + stats.savedMl) * 10000) / 10000,
          lastPromptSavedMl: stats.savedMl,
          totalPrompts: (d.totalPrompts || 0) + 1,
          totalSavedPercent: (d.totalSavedPercent || 0) + stats.savedPercent,
        });
      }
    );
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
  const stats = calcWaterSaved(prompt.length, improved.length);
  setReactValue(el, improved);
  updateWidgetStatus(null, stats);
}, true);

// Capture-phase click on the send button
document.addEventListener("click", (e) => {
  if (!enabled) return;
  if (!e.target.closest('button[data-testid="send-button"]')) return;
  const el = document.querySelector("#prompt-textarea");
  if (!el) return;
  const prompt = el.value || el.innerText;
  const improved = reduceAmbiguity(prompt);
  const stats = calcWaterSaved(prompt.length, improved.length);
  setReactValue(el, improved);
  updateWidgetStatus(null, stats);
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

// ─── Photo Interceptor ────────────────────────────────────────────────────────

let _ecoBypassNextUpload = false;

function processImageForEco(file) {
  return new Promise((resolve) => {
    const originalKb = (file.size / 1024).toFixed(1);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_EDGE = 512;
        let { width, height } = img;

        const originalTiles = Math.ceil(width / 512) * Math.ceil(height / 512);
        const originalTokens = originalTiles * 170;

        let newW = width, newH = height;
        if (newW > MAX_EDGE || newH > MAX_EDGE) {
          if (newW >= newH) { newH = Math.floor((newH / newW) * MAX_EDGE); newW = MAX_EDGE; }
          else              { newW = Math.floor((newW / newH) * MAX_EDGE); newH = MAX_EDGE; }
        }

        const canvas = document.createElement("canvas");
        canvas.width = newW; canvas.height = newH;
        canvas.getContext("2d").drawImage(img, 0, 0, newW, newH);

        const ecoB64 = canvas.toDataURL("image/jpeg", 0.8);
        const ecoKb  = Math.round((ecoB64.length * 3 / 4) / 1024);
        const optimizedTokens = 170;
        const tokensSaved = Math.max(0, originalTokens - optimizedTokens);
        const waterSavedMl = parseFloat((tokensSaved * 0.015).toFixed(2));

        resolve({
          original:  { width, height, tokens: originalTokens, sizeKb: originalKb },
          optimized: { width: newW, height: newH, tokens: optimizedTokens, sizeKb: ecoKb },
          tokensSaved, waterSavedMl, canvas,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function showPhotoModal(stats, file, input) {
  document.getElementById("eco-photo-overlay")?.remove();
  document.getElementById("eco-photo-style")?.remove();

  const style = document.createElement("style");
  style.id = "eco-photo-style";
  style.textContent = `
    #eco-photo-overlay {
      position: fixed; inset: 0; z-index: 2147483646;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
    }
    #eco-photo-modal {
      width: 370px;
      background: linear-gradient(160deg, #0d1f13 0%, #071820 100%);
      border: 1px solid rgba(56,189,248,0.22);
      border-radius: 20px; overflow: hidden;
      box-shadow: 0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #d1fae5; animation: eco-ph-in 0.25s ease;
    }
    @keyframes eco-ph-in {
      from { opacity:0; transform: scale(0.94) translateY(10px); }
      to   { opacity:1; transform: scale(1)    translateY(0);    }
    }
    .eco-ph-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .eco-ph-title { font-size:14px; font-weight:700; color:#22c55e; letter-spacing:0.3px; }
    .eco-ph-close {
      all:unset; cursor:pointer; color:#4b7a5a; font-size:14px;
      padding:2px 7px; border-radius:5px; transition:color .15s, background .15s;
    }
    .eco-ph-close:hover { color:#d1fae5; background:rgba(255,255,255,0.08); }
    .eco-ph-stats {
      display:flex; align-items:flex-start; gap:10px;
      padding: 14px 16px;
    }
    .eco-ph-col { flex:1; }
    .eco-ph-col-title {
      font-size:9px; font-weight:700; letter-spacing:1.2px;
      text-transform:uppercase; margin-bottom:8px;
      color:rgba(167,243,208,0.55);
    }
    .eco-ph-col.eco-opt .eco-ph-col-title { color:rgba(56,189,248,0.65); }
    .eco-ph-stat { font-size:12px; color:rgba(255,255,255,0.55); margin-bottom:4px; line-height:1.4; }
    .eco-ph-stat b { color:#d1fae5; }
    .eco-ph-divider {
      display:flex; align-items:center; padding-top:22px;
      color:rgba(56,189,248,0.35); font-size:18px; flex-shrink:0;
    }
    .eco-ph-water {
      margin:0 16px 14px;
      padding:11px 14px;
      background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.2);
      border-radius:12px; text-align:center;
    }
    .eco-ph-water-num { font-size:22px; font-weight:800; color:#38bdf8; }
    .eco-ph-water-label { font-size:11px; color:rgba(125,211,252,0.7); margin-top:2px; }
    .eco-ph-actions { display:flex; gap:8px; padding:0 16px 16px; }
    .eco-ph-cancel {
      all:unset; flex:1; cursor:pointer; text-align:center;
      padding:10px; border-radius:10px; font-size:13px;
      border:1px solid rgba(255,255,255,0.1); color:rgba(209,250,229,0.6);
      transition:background .15s;
    }
    .eco-ph-cancel:hover { background:rgba(255,255,255,0.06); }
    .eco-ph-confirm {
      all:unset; flex:2; cursor:pointer; text-align:center;
      padding:10px 14px; border-radius:10px; font-size:13px; font-weight:600;
      background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35);
      color:#38bdf8; transition:background .15s, border-color .15s;
    }
    .eco-ph-confirm:hover { background:rgba(56,189,248,0.22); border-color:rgba(56,189,248,0.6); }
  `;
  document.head.appendChild(style);

  const { original: o, optimized: opt, tokensSaved, waterSavedMl, canvas } = stats;

  const overlay = document.createElement("div");
  overlay.id = "eco-photo-overlay";
  overlay.innerHTML = `
    <div id="eco-photo-modal">
      <div class="eco-ph-header">
        <span class="eco-ph-title">🌿 Eco Photo Optimizer</span>
        <button class="eco-ph-close" id="eco-ph-close">✕</button>
      </div>
      <div class="eco-ph-stats">
        <div class="eco-ph-col">
          <div class="eco-ph-col-title">Original</div>
          <div class="eco-ph-stat">📐 <b>${o.width} × ${o.height}px</b></div>
          <div class="eco-ph-stat">🔲 <b>${o.tokens}</b> tokens</div>
          <div class="eco-ph-stat">📦 <b>${o.sizeKb} KB</b></div>
        </div>
        <div class="eco-ph-divider">→</div>
        <div class="eco-ph-col eco-opt">
          <div class="eco-ph-col-title">Optimized</div>
          <div class="eco-ph-stat">📐 <b>${opt.width} × ${opt.height}px</b></div>
          <div class="eco-ph-stat">🔲 <b>${opt.tokens}</b> tokens</div>
          <div class="eco-ph-stat">📦 <b>~${opt.sizeKb} KB</b></div>
        </div>
      </div>
      <div class="eco-ph-water">
        <div class="eco-ph-water-num">💧 ${waterSavedMl} ml saved</div>
        <div class="eco-ph-water-label">${tokensSaved} tokens reduced by resizing to 512px</div>
      </div>
      <div class="eco-ph-actions">
        <button class="eco-ph-cancel" id="eco-ph-cancel">Upload original</button>
        <button class="eco-ph-confirm" id="eco-ph-confirm">Reduce ${waterSavedMl} ml &amp; Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.remove();
    document.getElementById("eco-photo-style")?.remove();
  };

  document.getElementById("eco-ph-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  document.getElementById("eco-ph-cancel").addEventListener("click", () => {
    close();
    _ecoBypassNextUpload = true;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  document.getElementById("eco-ph-confirm").addEventListener("click", () => {
    close();
    canvas.toBlob((blob) => {
      const optimizedFile = new File(
        [blob],
        file.name.replace(/\.\w+$/, ".jpg"),
        { type: "image/jpeg" }
      );
      _ecoBypassNextUpload = true;
      const dt = new DataTransfer();
      dt.items.add(optimizedFile);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));

      // Click send after ChatGPT processes the upload
      setTimeout(() => {
        const sendBtn = document.querySelector('button[data-testid="send-button"]');
        if (sendBtn) sendBtn.click();
      }, 900);
    }, "image/jpeg", 0.8);
  });
}

function interceptFileInput(input) {
  if (input._ecoPhoto) return;
  input._ecoPhoto = true;
  input.addEventListener("change", async (e) => {
    if (!enabled) return;
    if (_ecoBypassNextUpload) { _ecoBypassNextUpload = false; return; }
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    e.stopImmediatePropagation();
    const stats = await processImageForEco(file);
    showPhotoModal(stats, file, input);
  }, true);
}

function startPhotoInterceptor() {
  document.querySelectorAll('input[type="file"]').forEach(interceptFileInput);
  new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('input[type="file"]')) interceptFileInput(node);
        node.querySelectorAll?.('input[type="file"]').forEach(interceptFileInput);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

// Init: read persisted state then inject widget
chrome.storage.local.get("ecoEnabled", ({ ecoEnabled }) => {
  enabled = !!ecoEnabled;
  injectWidget();
  applyState();
  startPhotoInterceptor();
});