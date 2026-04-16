async function init() {
  const { ecoEnabled } = await chrome.storage.local.get("ecoEnabled");
  setUI(!!ecoEnabled);
}

function setUI(on) {
  document.getElementById("toggle").checked = on;
  const status = document.getElementById("status");
  status.textContent = on ? "Active" : "Inactive";
  status.className = "status-text" + (on ? " active" : "");
}

document.getElementById("toggle").addEventListener("change", async (e) => {
  const newVal = e.target.checked;
  await chrome.storage.local.set({ ecoEnabled: newVal });
  setUI(newVal);
});

init();
