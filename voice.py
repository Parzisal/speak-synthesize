# import sounddevice as sd
# import time
# import torch
# from pydub.effects import speedup

# language = 'ru'
# model_id = 'v3_1_ru'
# sample_rate = 48000
# speaker = 'baya'
# put_accent = True
# put_yoo = True
# device = torch.device('cpu')
# text = "Привет Андрей! Хочу чтобы ты услышал мой голос и решил кого выбрать"

# model, _= torch.hub.load(repo_or_dir='snakers4/silero-models',
#                                        model='silero_tts',
#                                        language=language,
#                                        speaker=model_id)
# model.to(device)

# audio = model.apply_tts(text=text,
#                         speaker=speaker,
#                         sample_rate=sample_rate,
#                         put_accent=put_accent)

# print(text)

# sd.play(audio, sample_rate)
# time.sleep( len(audio) / sample_rate )
# sd.stop()

# from fastapi import FastAPI, Form
# from fastapi.responses import StreamingResponse
# import torch
# import io
# import array
# from pydub import AudioSegment
# from pydub.effects import speedup

# # 🎙️ Настройки TTS
# language = 'ru'
# model_id = 'v3_1_ru'
# sample_rate = 48000
# speaker = 'baya'
# put_accent = True
# put_yoo = True
# device = torch.device('cpu')

# # 🧠 Загрузка модели один раз при старте
# model, _ = torch.hub.load(repo_or_dir='snakers4/silero-models',
#                           model='silero_tts',
#                           language=language,
#                           speaker=model_id)
# model.to(device)

# # 🚀 FastAPI приложение
# app = FastAPI()

# @app.post("/speak")
# def synthesize(text: str = Form(...), speed: float = Form(1.3)):
#     # 🔊 Генерация аудио
#     audio = model.apply_tts(text=text,
#                             speaker=speaker,
#                             sample_rate=sample_rate,
#                             put_accent=put_accent)

#     # 📦 Преобразование Tensor → AudioSegment
#     int_samples = array.array('h', (int(s * 32767) for s in audio.tolist()))
#     sound = AudioSegment(
#         data=int_samples.tobytes(),
#         sample_width=2,
#         frame_rate=sample_rate,
#         channels=1
#     )

#     # ⚡ Ускорение
#     faster = speedup(sound, playback_speed=speed)

#     # 🎧 Возврат как MP3-стрим
#     buffer = io.BytesIO()
#     faster.export(buffer, format="mp3", bitrate="64k")
#     buffer.seek(0)
#     return StreamingResponse(buffer, media_type="audio/mpeg")
