FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files and install dependencies
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
RUN cd clothing-inspection-backend && npm ci --only=production

# Copy backend source
COPY clothing-inspection-backend ./clothing-inspection-backend

# Prepare uploads directory
RUN mkdir -p clothing-inspection-backend/uploads/inspection_receipts

# Set working directory to backend
WORKDIR /app/clothing-inspection-backend

EXPOSE 3002

# Start the application
CMD ["npm", "start"]
