// Collects every sentence the game can say → voice-lines.json (used by make_voice.py).
// Sources: src/voiceLines.js (fixed lines), avatar names, and the question files.
// Run: node scripts/voice-lines.mjs voice-lines.json
import { readFileSync, writeFileSync } from "fs";
import { splitSentences, keyOf, fileOf } from "../src/voiceKey.js";
import { FIXED_LINES } from "../src/voiceLines.js";

const read = rel => readFileSync(new URL("../" + rel, import.meta.url), "utf8");
const json = rel => JSON.parse(read(rel));
const lines = [...FIXED_LINES];

// "Hello, Kitty!" for every avatar
for (const m of read("src/avatars/index.js").matchAll(/name:\s*"([^"]+)"/g)) lines.push(`Hello, ${m[1]}!`);

// lines that come from the question files
const index = json("public/content/index.json");
for (const file of Object.values(index.monuments)) {
  const d = json("public/content/" + file);
  for (const q of d.questions || []) if (q.prompt) lines.push(q.prompt);                 // Counting Waterfall
  for (const w of d.words || []) {
    if (w.say) lines.push(`Say: ${w.say}`);                                             // Singing Stone
    if (w.word) lines.push(`Find the ${w.word}!`, `That's the ${w.word}!`, `${w.word}!`); // Giant Lollipop
  }
}

const out = new Map();
for (const l of lines) for (const s of splitSentences(l)) {
  const key = keyOf(s);
  if (key && !out.has(key)) out.set(key, { key, text: s, file: fileOf(key) });
}
writeFileSync(process.argv[2] || "voice-lines.json", JSON.stringify([...out.values()], null, 1));
console.log(`${out.size} voice lines`);
