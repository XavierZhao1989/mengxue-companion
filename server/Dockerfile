# Dockerfile for WeChat CloudRun (微信云托管) or any container host
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.api.json ./
COPY server ./server
COPY src/types ./src/types
COPY src/data ./src/data
COPY src/utils ./src/utils

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata && \
  ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  echo "Asia/Shanghai" > /etc/timezone
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/utils ./src/utils

EXPOSE 8080
CMD ["./node_modules/.bin/tsx", "server/standalone.ts"]
