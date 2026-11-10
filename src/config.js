// Where the app looks for updated question files.
// The GitHub workflow fills this in automatically with your GitHub Pages address,
// e.g. https://your-name.github.io/world-of-mikha/content/
// Leave empty to only use the questions packed inside the app.
const env = (import.meta && import.meta.env) || {};
export const CONTENT_URL = env.VITE_CONTENT_URL || "";
