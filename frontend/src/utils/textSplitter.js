/**
 * Utility for detecting and splitting multi-point campaign text.
 * Strictly splits ONLY when there are multiple endlines or blank lines (2 or more newlines with optional spaces).
 * Single endlines (\n) within the same paragraph are preserved so line-wrapped stories remain intact.
 */

// Matches 2 or more consecutive endlines (with optional whitespace or tabs on blank lines)
export const MULTIPLE_ENDLINES_REGEX = /(?:\r?\n[ \t]*){2,}/;

/**
 * Splits campaign text into an array of distinct items.
 * @param {string} text - Raw input text
 * @returns {string[]} Array of distinct text segments
 */
export function splitCampaignText(text) {
  if (!text || typeof text !== "string") return [];
  const clean = text.trim();
  if (!clean) return [];

  // Split strictly on multiple endlines / blank lines
  const parts = clean
    .split(MULTIPLE_ENDLINES_REGEX)
    .map((p) => p.trim())
    .filter((p) => p.length >= 20);

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
