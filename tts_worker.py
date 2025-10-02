import sys
import json
import torch
import io
import array
from pydub import AudioSegment
from pydub.effects import speedup

# 🎙️ Настройки
language = 'ru'
model_id = 'v3_1_ru'
sample_rate = 48000
speaker = 'baya'
put_accent = True
device = torch.device('cpu')

# 🧠 Загружаем модель один раз
model, _ = torch.hub.load(
    repo_or_dir='snakers4/silero-models',
    model='silero_tts',
    language=language,
    speaker=model_id,
    trust_repo=True
)
model.to(device)

def synthesize(text, speed):
    audio = model.apply_tts(
        text=text,
        speaker=speaker,
        sample_rate=sample_rate,
        put_accent=put_accent
    )

    int_samples = array.array('h', (int(s * 32767) for s in audio.tolist()))
    sound = AudioSegment(
        data=int_samples.tobytes(),
        sample_width=2,
        frame_rate=sample_rate,
        channels=1
    )

    faster = speedup(sound, playback_speed=float(speed))

    buffer = io.BytesIO()
    faster.export(buffer, format="mp3", bitrate="64k")
    return buffer.getvalue()

# 🔄 Цикл общения с Node.js
for line in sys.stdin:
    try:
        req = json.loads(line)
        text = req.get("text", "")
        speed = float(req.get("speed", 1.0))
        audio_bytes = synthesize(text, speed)

        # Отправляем длину + данные (base64)
        sys.stdout.buffer.write(len(audio_bytes).to_bytes(4, "big"))
        sys.stdout.buffer.write(audio_bytes)
        sys.stdout.flush()
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.stderr.flush()
