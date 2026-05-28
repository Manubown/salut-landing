# syntax: multi-stage. Build the Angular SSR app, then run it on a slim
# Node image. Mirrors the bown.at deploy pattern (port 80 via setcap,
# non-root user) so it drops straight into Coolify behind Traefik.

# --- build ---------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime -------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=80 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

# Let an unprivileged process bind port 80, and prepare the persistent
# data dir where the waitlist (subscribers.jsonl) is written.
RUN apk add --no-cache libcap \
 && addgroup -S nodejs -g 1001 \
 && adduser -S ng -u 1001 -G nodejs \
 && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")" \
 && mkdir -p /data && chown -R ng:nodejs /data

COPY --from=build --chown=ng:nodejs /app/dist/salut-landing ./dist/salut-landing

USER ng
EXPOSE 80
VOLUME ["/data"]
CMD ["node", "dist/salut-landing/server/server.mjs"]
