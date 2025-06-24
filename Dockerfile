########################  Stage 1 : deps  ########################
FROM --platform=linux/amd64 node:18-slim AS deps
WORKDIR /app

# 패키지 파일만 복사 → 의존성 설치
COPY clothing-inspection-backend/package*.json ./clothing-inspection-backend/
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && cd clothing-inspection-backend \
  && npm ci --omit=dev \
  && npm rebuild bcrypt --build-from-source \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

########################  Stage 2 : runtime  #####################
FROM --platform=linux/amd64 node:18-slim
WORKDIR /app

# 1) stage-1 에서 만든 node_modules 만 복사
COPY --from=deps /app/clothing-inspection-backend/node_modules \
                 /app/clothing-inspection-backend/node_modules
# 2) 소스 코드 복사 (node_modules 덮어쓰지 X)
COPY clothing-inspection-backend /app/clothing-inspection-backend

# 업로드 폴더 준비
RUN mkdir -p /app/clothing-inspection-backend/uploads/inspection_receipts
WORKDIR /app/clothing-inspection-backend

EXPOSE 3002
CMD ["sh", "-c", "node sync-db.js && npm start"]

ENV npm_config_build_from_source=true
