# --- Stage 1: Build base with Node.js + Python + ffmpeg ---
FROM node:18-bullseye

# Установим Python + ffmpeg
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean

# Создадим директорию для приложения
WORKDIR /app

# Установим Python-зависимости
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Установим Node.js зависимости
COPY package.json .
RUN npm install

# Скопируем исходники
COPY . .

# Запустим сервер
CMD ["npm", "start"]
