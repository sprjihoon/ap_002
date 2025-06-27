const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 업로드 폴더 생성
const baseDir = process.env.UPLOAD_BASE || path.join(__dirname, '..', '..', 'uploads');
const uploadDir = path.join(baseDir, 'images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 각 바코드별 폴더 생성 함수
const ensureBarcodeDir = (barcode) => {
  const barcodeDir = path.join(uploadDir, barcode);
  if (!fs.existsSync(barcodeDir)) {
    fs.mkdirSync(barcodeDir, { recursive: true });
  }
  return barcodeDir;
};

// 파일 정리 함수 (30개 초과 시 오래된 파일 삭제)
const cleanupOldFiles = (dir) => {
  const files = fs.readdirSync(dir);
  if (files.length > 30) {
    const sortedFiles = files
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(dir, file)).mtime.getTime()
      }))
      .sort((a, b) => a.time - b.time);
    
    // 오래된 파일부터 삭제
    const filesToDelete = sortedFiles.slice(0, files.length - 30);
    filesToDelete.forEach(file => {
      fs.unlinkSync(path.join(dir, file.name));
    });
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const barcodes = req.body['barcodes[]'] || req.body.barcodes;
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const uploadedUrls = [];

    if (barcodes) {
      // 기존 로직: 각 바코드별 폴더에 복사
      const barcodeArray = Array.isArray(barcodes) ? barcodes : [barcodes];
      for (const barcode of barcodeArray) {
        const barcodeDir = ensureBarcodeDir(barcode);
        const newFilePath = path.join(barcodeDir, req.file.filename);
        fs.copyFileSync(req.file.path, newFilePath);
        cleanupOldFiles(barcodeDir);
        uploadedUrls.push(`/uploads/images/${barcode}/${req.file.filename}`);
      }
    } else {
      // 바코드 미지정: 원본 위치(/uploads/images)에 그대로 활용
      uploadedUrls.push(`/uploads/images/${req.file.filename}`);
    }

    res.json({
      message: 'Files uploaded successfully',
      urls: uploadedUrls
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 