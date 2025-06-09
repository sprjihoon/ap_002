const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Product, ProductVariant } = require('../models');
const { auth } = require('../middleware/auth');

// 간단한 isAdmin 미들웨어 (userRoutes 내부와 동일 로직)
const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const upload = multer({ dest: 'uploads/' });

// 엑셀 업로드
router.post('/excel', auth, isAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다.' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const results = [];

    for (const row of rows) {
      const {
        회사,
        제품명,
        사이즈,
        컬러,
        바코드,
        도매처,
        도매처제품명,
        로케이션
      } = row;

      // 필수값 검사
      if (!회사 || !제품명 || !도매처 || !도매처제품명) {
        results.push({ 제품명, status: 'fail', message: '필수값 누락' });
        continue;
      }

      try {
        const product = await Product.create({
          company: 회사,
          productName: 제품명,
          size: 사이즈,
          color: 컬러,
          wholesaler: 도매처,
          wholesalerProductName: 도매처제품명,
          location: 로케이션 || null
        });

        // variants 조합
        const sizeList = 사이즈 ? 사이즈.split(',').map(s => s.trim()).filter(Boolean) : [null];
        const colorList = 컬러 ? 컬러.split(',').map(c => c.trim()).filter(Boolean) : [null];
        const variants = [];

        for (const s of sizeList) {
          for (const c of colorList) {
            const baseCode = Bar코드 || Date.now().toString();
            let fullCode = baseCode;
            if (s) fullCode += `-${s}`;
            if (c) fullCode += `-${c}`;
            variants.push({ productId: product.id, size: s, color: c, barcode: fullCode });
          }
        }

        await ProductVariant.bulkCreate(variants);
        results.push({ 제품명, status: 'ok' });
      } catch (err) {
        results.push({ 제품명, status: 'fail', message: err.message });
      }
    }

    // 업로드 파일 삭제
    fs.unlink(req.file.path, () => {});

    return res.json({ results });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router; 