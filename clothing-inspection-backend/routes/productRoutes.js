const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { Product, User, ProductVariant } = require('../models');

// 파일 업로드를 위한 multer 설정
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 엑셀 파일 업로드 및 처리
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        // 필수 필드 검증
        if (!row.company || !row.productName || !row.size || !row.color || !row.wholesaler || !row.wholesalerProductName) {
          throw new Error('필수 필드가 누락되었습니다.');
        }

        // 업체명+제품명으로 기존 Product 찾기
        let product = await Product.findOne({
          where: {
            company: row.company,
            productName: row.productName
          }
        });

        if (!product) {
          // 없으면 새 Product 생성
          product = await Product.create({
            company: row.company,
            productName: row.productName,
            size: row.size.split(',').map(s => s.trim()),
            color: row.color.split(',').map(c => c.trim()),
            wholesaler: row.wholesaler,
            wholesalerProductName: row.wholesalerProductName,
            location: row.location || null
          });
        }

        // 제품 변형(variant) 생성 (바코드가 있는 경우)
        if (row.barcode) {
          await ProductVariant.create({
            productId: product.id,
            size: row.size.split(',')[0].trim(),
            color: row.color.split(',')[0].trim(),
            barcode: row.barcode
          });
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: row,
          error: error.message
        });
      }
    }

    res.json({
      message: '엑셀 파일 처리 완료',
      results: results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 모든 제품 조회
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{
        model: ProductVariant,
        attributes: ['id', 'size', 'color', 'barcode']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 업체명 목록 조회(중복 제거, company 값이 null/빈문자 아닌 것만)
router.get('/companies', auth, async (req, res) => {
  try {
    console.log('Fetching companies...');
    
    // 우선 company 값이 실제로 있는 row만 필터 (조건 단순화)
    const users = await User.findAll({
      attributes: ['company'],
      where: {
        role: 'operator',
        company: { [Op.not]: null } // null만 우선 제외
      }
    });
    
    console.log('Found users:', users);

    // company가 빈문자('')인 경우도 제외 (JS에서 처리)
    const companies = [...new Set(users.map(u => u.company).filter(c => c && c.trim() !== ''))];
    console.log('Filtered companies:', companies);
    
    res.json(companies);
  } catch (error) {
    console.error('Error in /companies route:', error);
    res.status(500).json({ message: error.message });
  }
});

// 제품 등록
router.post('/', auth, async (req, res) => {
  try {
    const {
      company,
      productName,
      size,
      color,
      variants, // [{ size: 'S', color: '블랙', barcode: '123456' }, ...]
      wholesaler,
      wholesalerProductName,
      location
    } = req.body;

    // 제품 생성
    const product = await Product.create({
      company,
      productName,
      size,
      color,
      wholesaler,
      wholesalerProductName,
      location
    });

    // 바리에이션 생성
    const variantRecords = variants.map(variant => ({
      productId: product.id,
      size: variant.size ? variant.size.trim() : null,
      color: variant.color ? variant.color.trim() : null,
      barcode: variant.barcode.trim()
    }));

    await ProductVariant.bulkCreate(variantRecords);

    // 생성된 제품과 바리에이션 정보 반환
    const createdProduct = await Product.findByPk(product.id, {
      include: [{
        model: ProductVariant,
        attributes: ['id', 'size', 'color', 'barcode']
      }]
    });

    res.status(201).json({
      message: '제품이 등록되었습니다.',
      product: createdProduct
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: '이미 존재하는 바코드 번호입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// 제품 수정
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      company,
      productName,
      size,
      color,
      variants, // [{ size: 'S', color: '블랙', barcode: '123456' }, ...]
      wholesaler,
      wholesalerProductName,
      location
    } = req.body;

    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
    }

    // 기존 바리에이션 삭제
    await ProductVariant.destroy({
      where: { productId: product.id }
    });

    // 제품 정보 업데이트
    await product.update({
      company,
      productName,
      size,
      color,
      wholesaler,
      wholesalerProductName,
      location
    });

    // 새로운 바리에이션 생성
    const variantRecords = variants.map(variant => ({
      productId: product.id,
      size: variant.size ? variant.size.trim() : null,
      color: variant.color ? variant.color.trim() : null,
      barcode: variant.barcode.trim()
    }));

    await ProductVariant.bulkCreate(variantRecords);

    // 업데이트된 제품 정보 반환
    const updatedProduct = await Product.findByPk(product.id, {
      include: [{
        model: ProductVariant,
        attributes: ['id', 'size', 'color', 'barcode']
      }]
    });

    res.json({
      message: '제품 정보가 수정되었습니다.',
      product: updatedProduct
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: '이미 존재하는 바코드 번호입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// 제품 삭제
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
    }

    // 바리에이션도 함께 삭제
    await ProductVariant.destroy({
      where: { productId: product.id }
    });

    await product.destroy();
    res.json({ message: '제품이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 샘플 엑셀 파일 다운로드
router.get('/sample', auth, async (req, res) => {
  try {
    // 예시: 옵션별 한 줄, 바코드 각각 다르게
    const sampleData = [
      {
        company: 'A업체',
        productName: '반팔티',
        size: 'S',
        color: '블랙',
        wholesaler: '도매1',
        wholesalerProductName: '반팔티-블랙-S',
        location: '창고1',
        barcode: '100001'
      },
      {
        company: 'A업체',
        productName: '반팔티',
        size: 'S',
        color: '화이트',
        wholesaler: '도매1',
        wholesalerProductName: '반팔티-화이트-S',
        location: '창고1',
        barcode: '100002'
      },
      {
        company: 'A업체',
        productName: '반팔티',
        size: 'M',
        color: '블랙',
        wholesaler: '도매1',
        wholesalerProductName: '반팔티-블랙-M',
        location: '창고1',
        barcode: '100003'
      },
      {
        company: 'A업체',
        productName: '반팔티',
        size: 'M',
        color: '화이트',
        wholesaler: '도매1',
        wholesalerProductName: '반팔티-화이트-M',
        location: '창고1',
        barcode: '100004'
      },
      {
        company: 'B업체',
        productName: '긴팔티',
        size: 'L',
        color: '네이비',
        wholesaler: '도매2',
        wholesalerProductName: '긴팔티-네이비-L',
        location: '창고2',
        barcode: '200001'
      }
    ];
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 12 }
    ];
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="sample_products.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: '샘플 파일 생성 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 