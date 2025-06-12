const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const Inspection = require('../models/inspection');
const Clothes = require('../models/clothes');
const User = require('../models/user');
const { InspectionReceiptPhoto } = require('../models');

// 모든 검수 내역 조회
router.get('/', auth, async (req, res) => {
  try {
    const inspections = await Inspection.findAll();
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 새 검수 내역 등록
router.post('/', auth, async (req, res) => {
  try {
    const { inspectionName, company, result, comment } = req.body;
    const inspection = await Inspection.create({
      inspectionName,
      company,
      result,
      comment,
      inspector_id: req.user.id
    });
    res.status(201).json(inspection);
  } catch (error) {
    console.error('Inspection POST error:', error);
    res.status(400).json({ message: error.message });
  }
});

// 검수 내역 수정
router.put('/:id', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ message: '검수 내역을 찾을 수 없습니다.' });
    }
    await inspection.update(req.body);
    res.json(inspection);
  } catch (error) {
    console.error('Inspection PUT error:', error);
    res.status(400).json({ message: error.message });
  }
});

// 업로드 폴더 생성
const uploadDir = path.join(__dirname, '../uploads/inspection_receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 설정
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

// 전표별 영수증/증빙 사진 업로드
router.post('/inspections/:inspectionId/receipt-photo', auth, upload.single('file'), async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const inspection = await Inspection.findByPk(inspectionId);
    if (!inspection) {
      return res.status(404).json({ message: '검수 전표를 찾을 수 없습니다.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }
    const photo = await InspectionReceiptPhoto.create({
      inspectionId: inspection.id,
      filePath: `/uploads/inspection_receipts/${req.file.filename}`
    });
    res.json({
      message: '사진이 업로드되었습니다.',
      photo
    });
  } catch (error) {
    console.error('Receipt photo upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success:false, message:'검수 전표를 찾을 수 없습니다.'});
    }
    res.json({ success:true, data: inspection });
  } catch (error) {
    console.error('Inspection detail error:', error);
    res.status(500).json({ success:false, message: error.message });
  }
});

module.exports = router; 