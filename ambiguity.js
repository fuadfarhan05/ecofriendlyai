// Keep these globals for compatibility with existing content.js usage.
// Keep these focused on *common fluff* that doesn't change meaning.
// Prefer multi-word phrases; avoid single words like "can"/"you" that can break sentences.
const openingphrases = [
  "can you please",
  "could you please",
  "would you please",
  "can you",
  "could you",
  "would you",
  "i was wondering if you could",
  "i was wondering if",
  "is it possible to",
  "can u",
  "pls",
  "please",
];
const closingphrase = [
  "thanks in advance",
  "thank you so much",
  "thank you",
  "thanks",
  "appreciate it",
  "much appreciated",
  "have a nice day",
  "goodbye",
  "okay bye",
];

// reduceAmbiguity improvements:
// - removes common fluff (opening/closing) without changing meaning
// - strips mainly at start/end (avoids deleting meaningful mid-sentence text)
// - runs a few passes to handle stacked fluff
// - cleans up leftover punctuation/spacing

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function findAmbiguity(prompt) {
  const ambiguousPhrases = [...openingphrases, ...closingphrase];
  const lowerPrompt = String(prompt || "").toLowerCase();

  const found = ambiguousPhrases.filter((phrase) =>
    lowerPrompt.includes(String(phrase).toLowerCase())
  );

  if (found.length > 0) {
    console.log("Ambiguous phrases found:", found);
  }

  return found;
}

function reduceAmbiguity(prompt) {
  const ambiguousPhrases = [...openingphrases, ...closingphrase].sort(
    (a, b) => String(b).length - String(a).length
  );

  let reduced = String(prompt || "");

  // Strip fluff mainly at the start/end (where politeness usually lives).
  // Run multiple passes to handle stacked phrases like:
  // "Hey, can you please ... thanks in advance!"
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    let s = reduced.trim();

    // Leading phrases
    for (const phrase of openingphrases) {
      const re = new RegExp(
        `^\\s*(?:[\\-–—•*]+\\s*)?(?:hey|hi|hello)?[\\s,!.:-]*\\b${escapeRegex(
          phrase
        )}\\b[\\s,!.:-]*`,
        "i"
      );
      const next = s.replace(re, "");
      if (next !== s) {
        s = next;
        changed = true;
      }
    }

    // Trailing phrases
    for (const phrase of closingphrase) {
      const re = new RegExp(
        `[\\s,!.:-]*\\b${escapeRegex(phrase)}\\b[\\s,!.:-]*$`,
        "i"
      );
      const next = s.replace(re, "");
      if (next !== s) {
        s = next;
        changed = true;
      }
    }

    reduced = s;
    if (!changed) break;
  }

  // Light cleanup of repeated punctuation/whitespace.
  reduced = reduced.replace(/\s+([?.!,;:])/g, "$1");
  reduced = reduced.replace(/([?.!,;:]){2,}/g, "$1");
  return normalize(reduced);
}

function countChar(prompt) {
  const len = String(prompt || "").length;
  console.log(len);
  return len;
}  
