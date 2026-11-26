# Multi-stage build: each stage starts clean, and only what the app needs reaches the final image.

# ---- 1. Build the React client --------------------------------------------
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- 2. Install the server's production dependencies -----------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- 3. Final image: server code + dependencies + built client --------------
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=5000 \
    LOG_FILES=false
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY views ./views
COPY public ./public
COPY scripts ./scripts
COPY samples ./samples
COPY --from=client /app/client/dist ./client/dist

# Run as the unprivileged "node" user, not root
RUN mkdir -p uploads logs && chown node:node uploads logs
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]

