const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// 업로드 폴더 생성
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'images');
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
    if (!req.file || !barcodes) {
      return res.status(400).json({ error: 'No file or barcodes provided' });
    }

    // 바코드가 문자열로 전달된 경우 배열로 변환
    const barcodeArray = Array.isArray(barcodes) ? barcodes : [barcodes];
    
    // 각 바코드별로 파일 복사 및 정리
    const uploadedUrls = [];
    for (const barcode of barcodeArray) {
      const barcodeDir = ensureBarcodeDir(barcode);
      const newFilePath = path.join(barcodeDir, req.file.filename);
      
      // 원본 파일을 바코드 폴더로 복사
      fs.copyFileSync(req.file.path, newFilePath);
      
      // 파일 정리 (30개 초과 시 오래된 파일 삭제)
      cleanupOldFiles(barcodeDir);
      
      uploadedUrls.push(`/uploads/images/${barcode}/${req.file.filename}`);
    }

    // 원본 파일 삭제
    fs.unlinkSync(req.file.path);

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