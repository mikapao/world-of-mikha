// Every fixed sentence the game says out loud. The cloud build records each one with the
// "Emma" voice (see scripts/). Lines that come from the question files (math prompts,
// Singing Stone words, Lollipop words) and the avatar names are added automatically.
//
// ➜ If you add a new speak("…") line in the code, add it here too, so it gets recorded.
//   (Anything missing just uses the tablet's own voice instead.)
export const FIXED_LINES = [
  // start
  "Welcome to the World of Mikha!",
  "Hello Mikha! Let's play!",
  // Counting Waterfall
  "Yes!", "Wonderful!", "You got it!",
  "You did it! The waterfall is sparkling!",
  // Singing Stone
  "Hello! I am the Singing Stone. Say the words with me!",
  "What a brave voice!",
  "Nice! Can you say it a little louder?",
  "I couldn't hear you. Let's try again!",
  "Beautiful singing! The stone is glowing!",
  // Memory Snowman
  "Look carefully! Remember them all.",
  "Whoosh! Snow is falling!",
  "What is missing?",
  "You remembered!", "Super memory!", "Brilliant!",
  "What a super memory! The snowman is waving at you!",
  // Giant Lollipop
  "Try another one.",
  "Sweet! You know so many words! The lollipop is spinning!",
  // Firefly Pond
  "Watch the golden firefly!", "Keep watching!", "Which one was golden? Tap it!", "You found it!",
  "Which one is different?", "Yes! That one is different!",
  "Let's breathe slowly with the firefly.", "Breathe in", "Breathe out", "So calm. Well done.",
  "Beautiful focus! The fireflies are dancing for you!"
];
