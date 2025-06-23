FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files and install dependencies
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
# Install build tools to compile native modules such as bcrypt
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && cd clothing-inspection-backend \
    && npm ci --omit=dev \
    && npm rebuild bcrypt --build-from-source \
    && apk del .build-deps

# Copy backend source
COPY clothing-inspection-backend ./clothing-inspection-backend

# Prepare uploads directory
RUN mkdir -p clothing-inspection-backend/uploads/inspection_receipts

# Set working directory to backend
WORKDIR /app/clothing-inspection-backend

EXPOSE 3002

# Start the application
CMD ["npm", "start"]
