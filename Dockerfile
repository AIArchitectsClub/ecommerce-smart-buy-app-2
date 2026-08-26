# Builds the production artifact for Azure Container Apps. Render's deployment
# (render.yaml) is untouched and unaffected by this file — it uses its own
# native Node runtime, never Docker.
#
# The auto-generated deploy workflow tags the built image with ${{ github.sha
# }} — re-running that workflow via workflow_dispatch against an unchanged
# commit rebuilds and pushes the SAME tag, and Container Apps does not
# reliably create a new active revision when the image tag is unchanged, even
# though the workflow itself reports success. A real new commit (any change,
# this comment included) is what actually forces a new revision.

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
