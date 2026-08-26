# Builds the production artifact for Azure Container Apps. Render's deployment
# (render.yaml) is untouched and unaffected by this file — it uses its own
# native Node runtime, never Docker.

FROM node:26-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---

FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 3001
CMD ["npm", "start"]
