// ────────────────────────────────────
//  app.js ― Clothing-Inspection API
// ────────────────────────────────────
if (process.env.RUN_SYNC_DB === 'true') {
  require('./sync-db');
}

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const errorHandler = require('./middleware/errorHandler.js');

const userRoutes        = require('./routes/userRoutes');
const clothesRoutes     = require('./routes/clothesRoutes');
const inspectionRoutes  = require('./routes/inspectionRoutes');
const productRoutes     = require('./routes/productRoutes');
const uploadImageRoutes = require('./routes/uploadImage');
const workerRoutes      = require('./routes/workerRoutes');
const labelRoutes       = require('./routes/labelRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const defectRoutes      = require('./routes/defectRoutes');
const settingsRoutes    = require('./routes/settingsRoutes');

const app = express();

// Render/Nginx → 앱까지 1단계 프록시만 신뢰 (loopback)
app.set('trust proxy', ['loopback']);

/*──────────── 요청 로그 ───────────────*/
app.use((req, res, next) => {
  console.log(req.method, req.originalUrl, req.headers.origin);
  next();
});

/*─────── HTTP → HTTPS 리디렉트 ───────*/
app.use((req, res, next) => {
  // 이미 HTTPS이거나 프록시 헤더가 HTTPS인 경우 통과
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    return next();
  }
  return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
});

/*──────────────── CORS ────────────────*/
const allowed = (process.env.CORS_ORIGIN || 'https://spring.io.kr,https://www.spring.io.kr,https://ap-002-frontend.onrender.com,http://localhost:3000')
  .split(',')
  .map(o => o.trim());

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

app.use(cors(corsOptions));
// 프리플라이트 요청 처리
app.options('*', cors(corsOptions));

/*────────────── 미들웨어 ───────────────*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*──────────── 정적 파일 ────────────────*/
const uploadsPath = process.env.UPLOAD_BASE || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));
// allow /api/uploads for clients that prepend API base
app.use('/api/uploads', express.static(uploadsPath));

/*────────────── API 라우트 ─────────────*/
app.use('/api/users',       userRoutes);
app.use('/api/clothes',     clothesRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/products',    productRoutes);
app.use('/api',             uploadImageRoutes);
app.use('/api/worker',      workerRoutes);
app.use('/api/labels',      labelRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/defects',     defectRoutes);
app.use('/api/settings',    settingsRoutes);

/*────────────── 헬스체크 ───────────────*/
app.get('/',           (_, res) => res.json({ status: 'ok' }));
app.get('/api/healthz', (_, res) => res.json({ status: 'ok' }));

/*──────────────── 서버 기동 ────────────*/
const PORT   = process.env.PORT || 3002;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[✅] Server is running on port ${PORT}`);
});

/*──────────── 글로벌 예외 로거 ─────────*/
process.on('unhandledRejection', err =>
  console.error('💥 UnhandledRejection:', err));
process.on('uncaughtException',  err =>
  console.error('💥 UncaughtException:', err));

/*──────── SIGTERM 그레이스풀 종료 ─────*/
process.on('SIGTERM', () => {
  console.log('Received SIGTERM → graceful shutdown');
  server.close(() => process.exit(0));
});

app.use(errorHandler);
