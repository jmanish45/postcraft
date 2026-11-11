/**
 * Utility for detecting and splitting multi-point campaign text.
 * Handles campaign emojis (♦️, 🔹, etc.), numbered lists (1., 2.), bullet points (- , * ),
 * and double-newline paragraphs.
 */

// Common campaign delimiters and emojis
export const CAMPAIGN_DELIMITER_REGEX =
  /(?:^|\r?\n\s+)(?=[♦🔹🔸🔺▪▫•▶📍📌✅⭐]|(?:\d+[\.\)\-]\s+)|(?:[\-\*]\s+))|(?:\r?\n\s*)(?=[♦🔹🔸🔺▪▫•▶📍📌✅⭐]|(?:\d+[\.\)\-]\s+)|(?:[\-\*]\s+))/u;

/**
 * Splits campaign text into an array of distinct items.
 * @param {string} text - Raw input text
 * @returns {string[]} Array of distinct text segments
 */
export function splitCampaignText(text) {
  if (!text || typeof text !== "string") return [];
  const clean = text.trim();
  if (!clean) return [];

  // 1. Try splitting using emoji, numbered, and bullet markers
  let parts = clean
    .split(CAMPAIGN_DELIMITER_REGEX)
    .map((p) => p.trim())
    .filter((p) => p.length >= 20);

  // 2. Fallback: If no markers split the text into >= 2 items, try double newlines (paragraphs)
  if (parts.length <= 1) {
    parts = clean
      .split(/\r?\n\s*\r?\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 20);
  }

  return parts;
}

/**
 * Returns the count of distinct splittable points in a string.
 * Returns 0 if text cannot be split into at least 2 distinct points.
 * @param {string} text
 * @returns {number}
 */
export function getSplittablePointsCount(text) {
  if (!text || typeof text !== "string" || text.trim().length < 40) return 0;
  const parts = splitCampaignText(text);
  return parts.length >= 2 ? parts.length : 0;
}

