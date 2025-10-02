# tts_worker.py
import sys
import json
import io
import array
import logging
from pydub import AudioSegment
from pydub.effects import speedup

# минимальное логирование в stderr для диагностики
logging.basicConfig(stream=sys.stderr, level=logging.ERROR, format="%(message)s")

# настройки модели / аудио
sample_rate = 48000
speaker = "baya"

# загружаем модель один раз
try:
    import torch
    model, _ = torch.hub.load(
        repo_or_dir="snakers4/silero-models",
        model="silero_tts",
        language="ru",
        speaker="v3_1_ru",
        trust_repo=True,
    )
    model.to(torch.device("cpu"))
except Exception as e:
    logging.error(f"model load failed: {e}")
    sys.exit(1)


def synthesize(text: str, speed: float) -> bytes:
    # модель возвращает float samples в диапазоне [-1,1]
    audio = model.apply_tts(text=text, speaker=speaker, sample_rate=sample_rate, put_accent=True)
    int_samples = array.array("h", (int(max(-1.0, min(1.0, s)) * 32767) for s in audio.tolist()))
    sound = AudioSegment(data=int_samples.tobytes(), sample_width=2, frame_rate=sample_rate, channels=1)
    if speed != 1.0:
        sound = speedup(sound, playback_speed=float(speed))
    buf = io.BytesIO()
    sound.export(buf, format="mp3", bitrate="64k")
    return buf.getvalue()


def write_frame(b: bytes):
    # пишем 4 байта длины BE + данные
    sys.stdout.buffer.write(len(b).to_bytes(4, "big"))
    sys.stdout.buffer.write(b)
    sys.stdout.buffer.flush()


# читаем строки JSON из stdin (каждая строка — отдельный запрос)
for raw in sys.stdin:
    raw = raw.strip()
    if not raw:
        continue
    try:
        req = json.loads(raw)
        text = req.get("text", "")
        speed = float(req.get("speed", 1.0))
        if not isinstance(text, str) or not text.strip():
            logging.error("empty text")
            continue
        audio_bytes = synthesize(text, speed)
        write_frame(audio_bytes)
    except Exception as e:
        logging.error(f"worker error: {e}")
        # продолжаем работать дальше
        continue
