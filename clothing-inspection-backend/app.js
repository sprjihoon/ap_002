const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
const clothesRoutes = require('./routes/clothesRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadImageRoutes = require('./routes/uploadImage');

const app = express();

// Middleware
app.use(cors());
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 