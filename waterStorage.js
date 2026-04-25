/**
 * waterStorage.js — Water usage calculator for AI prompts
 *
 * Based on research:
 *   - UC Riverside (2023): ~10–50 ml per prompt for GPT-3/4
 *   - "How Hungry is AI?" benchmark (May 2025): ~3.5 ml per medium GPT-4o query (~500 tokens / ~2000 chars)
 *   - 1 token ≈ 4 characters
 *
 * Formula used:
 *   ml = (characters / 2000) * 3.5
 *   i.e. 0.00175 ml per character
 */

const WATER_ML_PER_CHAR = 0.00175; // ml per character (based on 3.5ml / 2000 chars)

/**
 * Calculate water usage in milliliters for a given character count.
 * so we have like character count 
 * @returns the number of  ml of water used (rounded to 4 decimal places)
 */
function calcWaterMl(charCount) {
  return Math.round(charCount * WATER_ML_PER_CHAR * 10000) / 10000; // keep in mind the 10000 is used for 4 decimal places. 
}

/**
 * Calculate water saved by shortening a prompt.
 * takes original character 
 * takes the shroted character
 * returns {{ originalMl: number, shortenedMl: number, savedMl: number, savedPercent: number }}
 */
function calcWaterSaved(originalChars, shortenedChars) {
  const originalMl = calcWaterMl(originalChars);
  const shortenedMl = calcWaterMl(shortenedChars);
  const savedMl = Math.round((originalMl - shortenedMl) * 10000) / 10000;
  const savedPercent =
    originalChars > 0
      ? Math.round(((originalChars - shortenedChars) / originalChars) * 100)
      : 0;

  return { originalMl, shortenedMl, savedMl, savedPercent };
}

/**
 * Format a ml value into a human-readable string.
 * param {number} ml
 * returns {string}
 */
function formatMl(ml) {
  if (ml < 1) return `${ml.toFixed(3)} ml`;
  if (ml < 1000) return `${ml.toFixed(2)} ml`;
  return `${(ml / 1000).toFixed(3)} L`;
}

/* 
When you introduce the formula:

"We sourced our numbers from two peer-reviewed studies. The first is a 2025 benchmark paper by 
Jegham and Abdelatti — How Hungry is AI? — published on arXiv in May 2025. They measured that 
a medium GPT-4o query consumes 1.75 watt-hours of energy, and using Microsoft Azure's Water Usage 
Effectiveness multiplier of 2 ml per watt-hour, that comes out to 3.5 ml of water per prompt."
 */