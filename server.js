import express from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";

const app = express();

app.use(
  cors({
    origin: "*",
  })
);

app.use(bodyParser.urlencoded({ extended: true }));

// 🐍 Запускаем Python воркер один раз
const py = spawn("python3", ["tts_worker.py"]);

// Очередь промисов для обработки ответов
let pending = [];
let buffer = Buffer.alloc(0);

// Когда Python прислал данные
py.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (buffer.length >= 4) {
    const size = buffer.readUInt32BE(0);
    if (buffer.length >= 4 + size) {
      const audio = buffer.slice(4, 4 + size);
      buffer = buffer.slice(4 + size);

      const resolve = pending.shift();
      if (resolve) resolve(audio);
    } else break;
  }
});

// Если ошибка
py.stderr.on("data", (data) => {
  console.error("Python error:", data.toString());
});

// Функция общения с Python
function synthesize(text, speed) {
  return new Promise((resolve, reject) => {
    pending.push(resolve);
    py.stdin.write(JSON.stringify({ text, speed }) + "\n");
  });
}

// 🎙️ API эндпоинт
app.post("/speak", async (req, res) => {
  try {
    const { text, speed = 1.3 } = req.body;
    const audio = await synthesize(text, speed);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (e) {
    console.error(e);
    res.status(500).send("Ошибка TTS");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
