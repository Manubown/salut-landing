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
    HOST=0.0.0.0

# Let an unprivileged process bind port 80. The waitlist now lives in the
# salut-api service, so there is no local data volume to prepare.
RUN apk add --no-cache libcap \
 && addgroup -S nodejs -g 1001 \
 && adduser -S ng -u 1001 -G nodejs \
 && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"

COPY --from=build --chown=ng:nodejs /app/dist/salut-landing ./dist/salut-landing

USER ng
EXPOSE 80
CMD ["node", "dist/salut-landing/server/server.mjs"]
