// Small grown-up settings kept on the tablet.
const BRIGHT_KEY = "wom_brightness", MUSIC_KEY = "wom_music_volume";
const num = (k, def, lo, hi) => { try { const v = parseFloat(localStorage.getItem(k)); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; } catch (e) { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };

/** overall scene brightness, 0.5 (dim) … 1.0 (full). Default is a calm 0.8 */
export const getBrightness = () => num(BRIGHT_KEY, 0.8, 0.5, 1);
export const setBrightness = v => save(BRIGHT_KEY, v);

/** background music volume, 0 (off) … 1. Default is a soft 0.35 */
export const getMusicVolume = () => num(MUSIC_KEY, 0.35, 0, 1);
export const setMusicVolume = v => save(MUSIC_KEY, v);
