# Root-level Dockerfile (optional)
# --------------------------------
# This Dockerfile builds and runs *only* the backend service.
# It exists so that generic docker build commands (or platforms expecting
# a top-level Dockerfile) do not fail with "no such file or directory".
# For production we still recommend using the dedicated Dockerfiles inside
# clothing-inspection-backend/ and clothing-inspection-frontend/ or the
# render.yaml blueprint.

FROM node:18-alpine AS deps
WORKDIR /app
COPY clothing-inspection-backend/package*.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev \
    && apk del python3 make g++

FROM node:18-alpine AS src
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY clothing-inspection-backend ./

EXPOSE 3002
CMD ["sh", "-c", "node sync-db.js && npm start"] 