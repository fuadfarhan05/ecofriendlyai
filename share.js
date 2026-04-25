function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

async function loadStats() {
  const data = await chrome.storage.local.get([
    "ecoEnabled",
    "ecoPreventedRetries",
    "ecoSince",
    "ecoStreakDays",
  ]);

  const enabled = !!data.ecoEnabled;
  const preventedRetries = Number(data.ecoPreventedRetries || 0);
  const since = data.ecoSince ? formatDate(data.ecoSince) : "—";
  const streak = Number(data.ecoStreakDays || 0);

  return { enabled, preventedRetries, since, streak };
}

async function main() {
  const badge = document.getElementById("badge");
  const bigStat = document.getElementById("bigStat");
  const sinceEl = document.getElementById("since");
  const streakEl = document.getElementById("streak");

  const stats = await loadStats();

  badge.textContent = stats.enabled ? "Eco Mode Active" : "Eco Mode Off";
  bigStat.textContent = String(stats.preventedRetries);
  sinceEl.textContent = stats.since;
  streakEl.textContent = stats.streak ? `${stats.streak} day(s)` : "—";
}

main();

