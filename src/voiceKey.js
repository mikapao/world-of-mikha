// Shared by the game AND the voice-recording script, so both agree on clip names.
// Speech is played sentence by sentence: "That's the donut! Find the cupcake!" = two clips.

/** split text into sentences ("Say: apple" stays one sentence) */
export const splitSentences = text =>
  (String(text).match(/[^.!?]+[.!?]*/g) || []).map(s => s.trim()).filter(s => /[a-z0-9]/i.test(s));

/** normalised lookup key: lower case, letters/digits/apostrophes only */
export const keyOf = s =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/** short stable file name for a key (FNV-1a hash) */
export function fileOf(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0") + ".mp3";
}
