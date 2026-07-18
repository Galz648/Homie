# Bun runtime for Homie listing ingest API.
FROM oven/bun:1.3-slim

WORKDIR /app

COPY package.json ./
RUN bun install

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
