# Use Debian-based image to avoid musl issues when compiling native modules
FROM --platform=linux/amd64 node:18-slim

# Set working directory
WORKDIR /app

# Copy backend package files and install dependencies
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
# Install build tools to compile native modules such as bcrypt
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && cd clothing-inspection-backend \
    && npm ci --omit=dev \
    && npm rebuild bcrypt --build-from-source \
    && apt-get remove -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy backend source
COPY clothing-inspection-backend ./clothing-inspection-backend

# Prepare uploads directory
RUN mkdir -p clothing-inspection-backend/uploads/inspection_receipts

# Set working directory to backend
WORKDIR /app/clothing-inspection-backend

EXPOSE 10000

CMD ["npm", "start"]

# Ensure native modules build from source if prebuilds missing
ENV npm_config_build_from_source=true
