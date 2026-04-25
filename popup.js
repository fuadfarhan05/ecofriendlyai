const BOTTLE_ML = 500;
const RING_CIRCUMFERENCE = 207.3;
const WATER_ML_PER_CHAR = 0.00175;


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

function updateDashboard(totalWaterMl, totalPrompts, totalSavedPercent) {
  const tokensSaved = Math.round((totalWaterMl / WATER_ML_PER_CHAR) / 4);
  const retriesAvoided = (tokensSaved * 0.00875).toFixed(2);
  const avgInputCut = totalPrompts > 0 ? Math.round(totalSavedPercent / totalPrompts) : 0;
  const energySaved = (tokensSaved * 0.000125).toFixed(4);

  const g = (id) => document.getElementById(id);
  if (g("stat-tokens"))  g("stat-tokens").textContent  = tokensSaved;
  if (g("stat-retries")) g("stat-retries").textContent = retriesAvoided;
  if (g("stat-avgcut"))  g("stat-avgcut").textContent  = `${avgInputCut}%`;
  if (g("stat-energy"))  g("stat-energy").textContent  = `${energySaved} Wh`;
}

async function init() {
  const { ecoEnabled, totalWaterSavedMl, totalPrompts, totalSavedPercent } =
    await chrome.storage.local.get(["ecoEnabled", "totalWaterSavedMl", "totalPrompts", "totalSavedPercent"]);
  setUI(!!ecoEnabled);
  updateWaterTracker(totalWaterSavedMl || 0);
  updateDashboard(totalWaterSavedMl || 0, totalPrompts || 0, totalSavedPercent || 0);
}

chrome.storage.onChanged.addListener((changes) => {
  if ("totalWaterSavedMl" in changes || "totalPrompts" in changes) {
    chrome.storage.local.get(["totalWaterSavedMl", "totalPrompts", "totalSavedPercent"], (d) => {
      updateWaterTracker(d.totalWaterSavedMl || 0);
      updateDashboard(d.totalWaterSavedMl || 0, d.totalPrompts || 0, d.totalSavedPercent || 0);
    });
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
