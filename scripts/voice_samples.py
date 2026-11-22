"""Records a few test sentences with several Kokoro voices so the owner can pick one by ear.

Runs in the GitHub workflow "voice-samples". Writes samples/<voice>-<speed>/<n>-<slug>.mp3
and zips everything to voice-samples.zip.

    python scripts/voice_samples.py
"""
import os, shutil, subprocess
import numpy as np
import soundfile as sf
from kokoro import KPipeline

SENTENCES = [
    ("1-welcome", "Welcome to the World of Mikha!"),
    ("2-found-it", "Wow, you found it! Great job!"),
    ("3-count", "How many apples can you count?"),
    ("4-say-cat", "Say: I see a cat"),
    ("5-brave", "Yay! You did it! You are so brave!"),
    ("6-go-back", "Let's go back to the island."),
]
# (voice, speed, lang_code)  "b" = British English, "a" = American English
CANDIDATES = [
    ("bf_emma", 0.9, "b"), ("bf_emma", 1.0, "b"), ("bf_isabella", 1.0, "b"), ("bf_alice", 1.0, "b"),
    ("bf_lily", 1.0, "b"), ("af_heart", 1.0, "a"), ("af_bella", 1.0, "a"), ("af_nicole", 1.0, "a"),
]

pipes = {}
def get_pipe(lang):
    if lang not in pipes:                      # one pipeline per language code, created once
        try:
            pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
        except TypeError:                      # older kokoro versions
            pipes[lang] = KPipeline(lang_code=lang)
    return pipes[lang]

out = "samples"
shutil.rmtree(out, ignore_errors=True)
pad = np.zeros(int(24000 * 0.12), dtype=np.float32)
for voice, speed, lang in CANDIDATES:
    pipe = get_pipe(lang)
    folder = os.path.join(out, f"{voice}-{speed}")
    os.makedirs(folder, exist_ok=True)
    for slug, text in SENTENCES:
        chunks = []
        for _, _, audio in pipe(text, voice=voice, speed=speed):
            if audio is None: continue
            chunks.append(audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio))
        if not chunks:
            print("skipped:", voice, text); continue
        mp3 = os.path.join(folder, slug + ".mp3")
        wav = mp3[:-4] + ".wav"
        sf.write(wav, np.concatenate([pad, *chunks, pad]).astype(np.float32), 24000)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "24000", "-b:a", "48k", mp3], check=True)
        os.remove(wav)
    print("done:", voice, speed)

shutil.make_archive("voice-samples", "zip", out)
print("voice-samples.zip ready")
