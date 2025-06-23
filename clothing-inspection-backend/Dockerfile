FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production \
    && npm rebuild bcrypt --build-from-source

# 소스 코드 복사
COPY . .

# 업로드 디렉토리 생성
RUN mkdir -p uploads/inspection_receipts

# 포트 노출
EXPOSE 3002

# 애플리케이션 시작
CMD ["npm", "start"]
