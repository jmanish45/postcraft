/**
 * Twitter (X) weighted character counter.
 * Rules:
 * - URLs (http:// or https://) count as exactly 23 characters (t.co wrap).
 * - CJK characters, emojis, and specific high Unicode ranges count as 2 characters.
 * - Basic Latin, numbers, punctuation, and Devanagari (Hindi) count as 1 character.
 */

const URL_REGEX = /https?:\/\/[^\s]+/g;

export function calculateTwitterLength(text) {
  if (!text) return 0;

  // 1. Calculate URL weights: every URL counts as 23 characters
  const urlMatches = text.match(URL_REGEX) || [];
  const urlWeight = urlMatches.length * 23;

  // 2. Remove URLs to evaluate remaining characters
  const withoutUrls = text.replace(URL_REGEX, "");

  // 3. Count weighted code points
  let textWeight = 0;
  const codePoints = Array.from(withoutUrls);

  for (const char of codePoints) {
    const code = char.codePointAt(0);
    if (!code) continue;

    // Check if character is CJK, emoji, or double-weight symbols
    const isWeight2 =
      (code >= 0x1100 && code <= 0x11ff) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0x9fff) || // CJK Radicals, Kangxi, Ideographs
      (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0xfe10 && code <= 0xfe1f) || // Vertical Forms
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
      (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Signs
      (code >= 0x1f000 && code <= 0x1ffff) || // Emojis, Symbols, Pictographs
      (code >= 0x20000 && code <= 0x2fa1f); // CJK Unified Ideographs Extension

    textWeight += isWeight2 ? 2 : 1;
  }

  return urlWeight + textWeight;
}

export const TWITTER_MAX_LENGTH = 280;

