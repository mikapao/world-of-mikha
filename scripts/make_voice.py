"""Records every game sentence with the Kokoro text-to-speech model (British voice "Emma").

Runs in the GitHub build (see .github/workflows). Writes small MP3s + index.json into
public/voice/, which the game plays instead of the tablet's own voice.

    python scripts/make_voice.py voice-lines.json public/voice

Kokoro: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0).
Change the voice with the VOICE env var (bf_emma, bf_isabella, bf_alice, bf_lily).
"""
import json, os, subprocess, sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

lines = json.load(open(sys.argv[1], encoding="utf-8"))
out = sys.argv[2]
voice = os.environ.get("VOICE", "bf_emma")
speed = float(os.environ.get("VOICE_SPEED", "0.9"))   # a little slower for a 5-year-old
os.makedirs(out, exist_ok=True)

# a different voice/speed than last time = record everything again
stamp = os.path.join(out, "voice.txt")
setting = f"{voice} {speed}"
if not os.path.exists(stamp) or open(stamp).read().strip() != setting:
    for f in os.listdir(out):
        if f.endswith(".mp3"): os.remove(os.path.join(out, f))
    open(stamp, "w").write(setting)

try:
    pipe = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")   # "b" = British English
except TypeError:                                                    # older kokoro versions
    pipe = KPipeline(lang_code="b")
pad = np.zeros(int(24000 * 0.12), dtype=np.float32)
index, made = {}, 0
for line in lines:
    mp3 = os.path.join(out, line["file"])
    if not os.path.exists(mp3):
        chunks = []
        for _, _, audio in pipe(line["text"], voice=voice, speed=speed):
            if audio is None: continue
            chunks.append(audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio))
        if not chunks:
            print("skipped:", line["text"]); continue
        wav = mp3[:-4] + ".wav"
        sf.write(wav, np.concatenate([pad, *chunks, pad]).astype(np.float32), 24000)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-b:a", "48k", mp3], check=True)
        os.remove(wav)
        made += 1
    index[line["key"]] = line["file"]

keep = set(index.values())                      # tidy up clips no longer used
for f in os.listdir(out):
    if f.endswith(".mp3") and f not in keep: os.remove(os.path.join(out, f))

json.dump({"voice": voice, "lines": index}, open(os.path.join(out, "index.json"), "w"), ensure_ascii=False)
print(f"{len(index)} voice lines ready ({made} newly recorded) with {voice}")
