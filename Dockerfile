FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/creepy-machine.db

COPY --from=build /app /app

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
