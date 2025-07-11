# -------- Stage 1: React build --------
FROM --platform=linux/amd64 node:18 AS react-build
WORKDIR /frontend

# Install dependencies & build
COPY clothing-inspection-frontend/package*.json ./
RUN npm ci --omit=dev
COPY clothing-inspection-frontend .
RUN npm run build

# -------- Stage 2: API + runtime --------
FROM --platform=linux/amd64 node:18-slim
WORKDIR /app

# Copy backend package files & install deps
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && cd clothing-inspection-backend \
 && npm ci --omit=dev \
 && npm rebuild bcrypt --build-from-source \
 && apt-get purge -y python3 make g++ \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

# Copy backend source code
COPY clothing-inspection-backend ./clothing-inspection-backend

# Copy React build into backend/client/build
COPY --from=react-build /frontend/build ./clothing-inspection-backend/client/build

# Default environment
ENV PORT=3000

WORKDIR /app/clothing-inspection-backend

EXPOSE 3000
CMD ["node", "app.js"]
