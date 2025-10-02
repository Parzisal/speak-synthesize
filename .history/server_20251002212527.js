import express from "express";
import bodyParser from "body-parser";
import { spawn } from "child_process";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/speak", (req, res) => {
  const { text, speed = 1.3 } = req.body;

  // Запуск Python
  const py = spawn("python3", ["speak.py", text, speed]);

  res.setHeader("Content-Type", "audio/mpeg");

  // Поток mp3 сразу клиенту
  py.stdout.pipe(res);

  py.stderr.on("data", (data) => {
    console.error(`Ошибка Python: ${data}`);
  });

  py.on("close", (code) => {
    if (code !== 0) {
      res.status(500).send("Ошибка TTS");
    }
  });
});

app.listen(3000, () => console.log("🚀 Server on http://localhost:3000"));
