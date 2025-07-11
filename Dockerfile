# -------- Stage 1 : Build React frontend --------
FROM --platform=linux/amd64 node:18 AS frontend-build
WORKDIR /frontend

# Install dependencies and build React app
COPY clothing-inspection-frontend/package*.json ./
RUN npm ci --omit=dev

COPY clothing-inspection-frontend ./
RUN npm run build

# -------- Stage 2 : Build Express backend & runtime --------
FROM --platform=linux/amd64 node:18-slim AS backend-runtime
WORKDIR /app

# Backend dependencies
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && cd clothing-inspection-backend \
 && npm ci --omit=dev \
 && npm rebuild bcrypt --build-from-source \
 && apt-get purge -y python3 make g++ \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

# Copy backend source
COPY clothing-inspection-backend ./clothing-inspection-backend

# Copy React build into backend client folder
COPY --from=frontend-build /frontend/build ./clothing-inspection-backend/client/build

# Runtime configuration
WORKDIR /app/clothing-inspection-backend
ENV PORT=3000
EXPOSE 3000

CMD ["node", "app.js"]
