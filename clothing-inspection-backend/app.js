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
app.use(cors({
  origin: 'http://localhost:3000', // React 개발 서버의 포트
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

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
}); 