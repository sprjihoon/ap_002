require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const clothesRoutes = require('./routes/clothesRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadImageRoutes = require('./routes/uploadImage');
const workerRoutes = require('./routes/workerRoutes');
const labelRoutes = require('./routes/labelRoutes');
const adminRoutes = require('./routes/adminRoutes');
const defectRoutes = require('./routes/defectRoutes');
const mongoose = require('mongoose');

const app = express();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o=>o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // allow REST tools or server-to-server requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/clothes', clothesRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/products', productRoutes);
app.use('/api', uploadImageRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/defects', defectRoutes);

// Simple root route for uptime checks
app.get('/', (req, res) => {
  res.send('Clothing Inspection API');
});

// Health check endpoint for Render
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
