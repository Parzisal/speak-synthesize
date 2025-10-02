// server.js
import express from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// запускаем Python-воркер один раз
const py = spawn("python3", ["tts_worker.py"], {
  stdio: ["pipe", "pipe", "pipe"],
});

py.on("exit", (code, signal) => {
  console.error("Python exited", { code, signal });
  // при желании здесь можно перезапускать воркер или завершать процесс
});

py.stderr.on("data", (d) => {
  // Python пишет логи/progress в stderr — логируем, но не мешаем фреймингу stdout

  if (
    !d
      .toString()
      .trim()
      .match(/^\d+(\.\d+)?%/)
  ) {
    console.error("py stderr:", d.toString().trim());
  }
});

// очередь задач; inFlight — текущий запрос, который ждём от Python
const queue = [];
let buffer = Buffer.alloc(0);
let inFlight = null; // { text, speed, resolve, reject, timer }

// читаем фреймы: [4 байта BE length][payload]
py.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (buffer.length >= 4) {
    const size = buffer.readUInt32BE(0);
    if (buffer.length < 4 + size) break;
    const audio = buffer.slice(4, 4 + size);
    buffer = buffer.slice(4 + size);

    if (!inFlight) {
      // неожиданно пришёл фрейм без запроса — логируем и пропускаем
      console.error("Unexpected frame without inFlight");
      continue;
    }

    clearTimeout(inFlight.timer);
    inFlight.resolve(audio);
    inFlight = null;
    processNext();
  }
});

py.on("error", (err) => {
  console.error("python spawn error:", err);
  // отклоняем текущую задачу и очищаем очередь
  if (inFlight) {
    inFlight.reject(err);
    inFlight = null;
  }
  while (queue.length) {
    const it = queue.shift();
    it.reject(new Error("Python worker unavailable"));
  }
});

// отправка JSON-строки в Python (с учётом backpressure)
function sendToPython(item) {
  const payload = JSON.stringify({ text: item.text, speed: item.speed }) + "\n";
  const ok = py.stdin.write(payload, "utf8");
  if (!ok) {
    // если буфер переполнен — дождаться drain
    py.stdin.once("drain", () => {});
  }
}

// обработка очереди: берём первый элемент и делаем его inFlight
function processNext() {
  if (inFlight || queue.length === 0) return;
  const item = queue.shift();
  inFlight = item;

  // таймаут на случай, если python зависнет или не вернёт ответ
  inFlight.timer = setTimeout(() => {
    if (!inFlight) return;
    inFlight.reject(new Error("TTS timeout"));
    inFlight = null;
    processNext();
  }, item.timeoutMs || 15000);

  try {
    sendToPython(item);
  } catch (err) {
    clearTimeout(inFlight.timer);
    inFlight = null;
    item.reject(err);
    processNext();
  }
}

// функция для внешнего вызова: возвращает Promise с аудио-буфером
function synthesize(text, speed = 1.0, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const item = { text, speed, resolve, reject, timeoutMs, timer: null };
    queue.push(item);
    processNext();
  });
}

// API endpoint
app.post("/speak", async (req, res) => {
  try {
    const { text, speed = 1.3 } = req.body;
    if (typeof text !== "string" || !text.trim())
      return res.status(400).send("Missing text");

    console.log("до async", { text, speed });
    const audio = await synthesize(text, parseFloat(speed) || 1.0);
    console.log("после async", audio.length);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (e) {
    console.error("speak error:", e);
    res.status(500).send("Ошибка TTS");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
