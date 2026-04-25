function formatMl(ml) {
  if (ml < 1) return `${ml.toFixed(3)} ml`;
  if (ml < 1000) return `${ml.toFixed(1)} ml`;
  return `${(ml / 1000).toFixed(2)} L`;
}

function formatBottles(ml) {
  const bottles = ml / 500;
  if (bottles < 0.1) return null;
  if (bottles < 1) return `Less than 1 water bottle`;
  return `≈ ${bottles.toFixed(1)} water bottles`;
}

async function loadStats() {
  const { totalWaterSavedMl } = await chrome.storage.local.get("totalWaterSavedMl");
  const total = totalWaterSavedMl || 0;

  document.getElementById("amount").textContent = formatMl(total);

  const bottleLabel = formatBottles(total);
  const bottlesRow = document.getElementById("bottlesRow");
  const bottlesText = document.getElementById("bottlesText");
  if (bottleLabel) {
    bottlesText.textContent = bottleLabel;
    bottlesRow.style.display = "flex";
  } else {
    bottlesRow.style.display = "none";
  }

  const dateEl = document.getElementById("footerDate");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
}

function initPhotoUpload() {
  const zone = document.getElementById("avatarZone");
  const input = document.getElementById("photoInput");
  const img = document.getElementById("avatarImg");
  const empty = document.getElementById("avatarEmpty");

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
      img.style.display = "block";
      empty.style.display = "none";
    };
    reader.readAsDataURL(file);
  });
}

loadStats();
initPhotoUpload();
