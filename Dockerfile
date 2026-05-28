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
    PORT=4000 \
    HOST=0.0.0.0

# Run as a non-root user. The app listens on an unprivileged port (4000) and
# Coolify/Traefik terminates TLS and routes the domain to it — so set Coolify's
# "Ports Exposes" to 4000. The waitlist lives in salut-api, so no data volume.
RUN addgroup -S nodejs -g 1001 \
 && adduser -S ng -u 1001 -G nodejs

COPY --from=build --chown=ng:nodejs /app/dist/salut-landing ./dist/salut-landing

USER ng
EXPOSE 4000
CMD ["node", "dist/salut-landing/server/server.mjs"]
