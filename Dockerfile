FROM node:18-bullseye

RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    apt-get clean

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY package.json .
RUN npm install

COPY . .

CMD ["npm", "start"]
