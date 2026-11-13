# Lume engine image. Build from the repository root:
#   docker build -f server/Dockerfile -t lume-engine .
# One image runs every role: `api`, `worker`, `all`, `migrate` or `seed`.

FROM node:22-alpine AS build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

FROM python:3.12-alpine AS web
WORKDIR /web
COPY web/build.py ./
COPY web/src ./src
COPY web/brand ./brand
RUN mkdir -p dist && python3 build.py --edition cimb

FROM node:22-alpine
RUN apk add --no-cache tzdata
ENV NODE_ENV=production TZ=Asia/Jakarta PORT=8080
WORKDIR /app
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
COPY server/package.json server/package.json
COPY server/migrations server/migrations
COPY server/public server/public
# the console and the shared rules kernel (classifier, compliance check, OJK clock)
COPY web/src web/src
COPY --from=web /web/dist/lume-cimb-niaga-desktop.html web/dist/lume-cimb-niaga-desktop.html
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:8080/api/v1/health >/dev/null || exit 1
ENTRYPOINT ["node", "server/dist/index.js"]
CMD ["all"]
