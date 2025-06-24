// ────────────────────────────────────
//  app.js ― Clothing-Inspection API
// ────────────────────────────────────
if (process.env.RUN\_SYNC\_DB === 'true') {
require('./sync-db');
}

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const userRoutes       = require('./routes/userRoutes');
const clothesRoutes    = require('./routes/clothesRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const productRoutes    = require('./routes/productRoutes');
const uploadImageRoutes= require('./routes/uploadImage');
const workerRoutes     = require('./routes/workerRoutes');
const labelRoutes      = require('./routes/labelRoutes');
const adminRoutes      = require('./routes/adminRoutes');
const defectRoutes     = require('./routes/defectRoutes');

const app = express();

/*──────────────── CORS ────────────────*/
const allowed = (process.env.CORS\_ORIGIN || '[http://localhost:3000](http://localhost:3000)')
.split(',').map(o => o.trim());

app.use(cors({
origin(origin, cb) {
if (!origin || allowed.includes('\*') || allowed.includes(origin)) {
return cb(null, true);
}
return cb(new Error('Not allowed by CORS'));
},
credentials: true,
}));

/*────────────── 기본 미들웨어 ─────────────*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*────────────── 정적 파일 ────────────────*/
app.use('/uploads', express.static(path.join(\_\_dirname, '..', 'uploads')));

/*────────────── API 라우트 ───────────────*/
app.use('/api/users',       userRoutes);
app.use('/api/clothes',     clothesRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/products',    productRoutes);
app.use('/api',             uploadImageRoutes);
app.use('/api/worker',      workerRoutes);
app.use('/api/labels',      labelRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/defects',     defectRoutes);

/*────────────── 헬스-체크 ────────────────*/
// Render 기본 health-check (루트)
app.get('/', (*, res) => res.send('OK'));           // 200 OK
// 커스텀 health-check (설정에서 경로를 /api/healthz 로 바꿨다면)
app.get('/api/healthz', (*, res) => res.json({ status: 'ok' }));

/*──────────────── 서버 기동 ───────────────*/
const PORT   = process.env.PORT || 3002;
const server = app.listen(PORT, '0.0.0.0', () => {
console.log(`[✅] Server is running on port ${PORT}`);
});

/*──────────── 글로벌 예외 로거 ────────────*/
process.on('unhandledRejection', err =>
console.error('💥 UnhandledRejection:', err));
process.on('uncaughtException',  err =>
console.error('💥 UncaughtException:', err));

/*───────────── SIGTERM 그레이스풀 종료 ───*/
process.on('SIGTERM', () => {
console.log('Received SIGTERM → graceful shutdown');
server.close(() => process.exit(0));
});
