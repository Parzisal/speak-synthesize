FROM node:18-bullseye

# prod env
ENV NODE_ENV=production

# install system deps in single layer and clean apt lists
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "start"]
