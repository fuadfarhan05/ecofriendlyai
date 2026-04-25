const BOTTLE_ML = 500;
const RING_CIRCUMFERENCE = 207.3;


function updateWaterTracker(totalMl) {
  const fraction = (totalMl % BOTTLE_ML) / BOTTLE_ML;
  const offset = RING_CIRCUMFERENCE - fraction * RING_CIRCUMFERENCE;

  const ring = document.getElementById("water-ring");
  if (ring) ring.style.strokeDashoffset = offset;

  const mlText = document.getElementById("water-ml");
  if (!mlText) return;
  if (totalMl < 1) mlText.textContent = `${totalMl.toFixed(3)} ml`;
  else if (totalMl < 1000) mlText.textContent = `${totalMl.toFixed(2)} ml`;
  else mlText.textContent = `${(totalMl / 1000).toFixed(2)} L`;
}

function setUI(on) {
  document.getElementById("toggle").checked = on;
  const status = document.getElementById("status");
  status.textContent = on ? "Active" : "Inactive";
  status.className = "status-text" + (on ? " active" : "");
}

async function init() {
  const { ecoEnabled, totalWaterSavedMl } = await chrome.storage.local.get(["ecoEnabled", "totalWaterSavedMl"]);
  setUI(!!ecoEnabled);
  updateWaterTracker(totalWaterSavedMl || 0);
}

chrome.storage.onChanged.addListener((changes) => {
  if ("totalWaterSavedMl" in changes) {
    updateWaterTracker(changes.totalWaterSavedMl.newValue || 0);
  }
});

document.getElementById("toggle").addEventListener("change", async (e) => {
  const newVal = e.target.checked;
  await chrome.storage.local.set({ ecoEnabled: newVal });
  setUI(newVal);
});

document.getElementById("share").addEventListener("click", async () => {
  const url = chrome.runtime.getURL("share.html");
  await chrome.tabs.create({ url });
});

init();
