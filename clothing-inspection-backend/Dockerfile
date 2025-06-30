# Use the Debian-based image to avoid musl related issues when building
# native modules like bcrypt
# Build specifically for amd64 to avoid issues when Render uses arm builders
FROM --platform=linux/amd64 node:18-slim

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && npm install --omit=dev \
    && npm rebuild bcrypt --build-from-source \
    && apt-get remove -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# 소스 코드 복사
COPY . .

# 업로드 디렉토리 생성
RUN mkdir -p uploads/inspection_receipts

# Set default environment PORT if not provided
ENV PORT=3002

# Run the app
CMD ["npm", "start"]
