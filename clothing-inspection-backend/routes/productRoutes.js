const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { Product, User, ProductVariant } = require('../models');
const path = require('path');
const fs = require('fs');

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

// 샘플 엑셀 다운로드 : 동적으로 생성
router.get('/sample', auth, async (req, res) => {
  try {
    const header = [
      'company',
      'productName',
      'size',
      'color',
      'barcode',
      'wholesaler',
      'wholesalerProductName',
      'location'
    ];

    const ws = xlsx.utils.aoa_to_sheet([header]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'sample');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=sample_products.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Sample download error:', err);
    return res.status(500).json({ message: err.message });
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

    // 필드 매핑 헬퍼: 여러 키 후보 중 먼저 매칭되는 값을 반환
    const pick = (r, ...keys) => {
      for (const k of keys) {
        if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') {
          return String(r[k]).trim();
        }
      }
      return '';
    };

    for (const row of data) {
      try {
        // 컬럼별 값 추출 (영문/한글 헤더 모두 지원)
        const company               = pick(row, 'company', '업체', '업체명');
        const productName           = pick(row, 'productName', '제품명');
        const sizeRaw               = pick(row, 'size', '사이즈');
        const colorRaw              = pick(row, 'color', '컬러', '색상');
        const barcode               = pick(row, 'barcode', '바코드');
        const wholesaler            = pick(row, 'wholesaler', '도매처');
        const wholesalerProductName = pick(row, 'wholesalerProductName', '도매처제품명', '도매처 상품명');
        const location              = pick(row, 'location', '로케이션');

        // 필수 필드 검증
        if (!company || !productName || !sizeRaw || !colorRaw || !wholesaler || !wholesalerProductName) {
          throw new Error('필수 필드가 누락되었습니다.');
        }

        // 업체명+제품명으로 기존 Product 찾기
        let product = await Product.findOne({
          where: {
            company: company,
            productName: productName
          }
        });

        if (!product) {
          // 없으면 새 Product 생성
          product = await Product.create({
            company,
            productName,
            size: sizeRaw.split(',').map(s => s.trim()),
            color: colorRaw.split(',').map(c => c.trim()),
            wholesaler,
            wholesalerProductName,
            location: location || null
          });
        }

        // 제품 변형(variant) 생성 (바코드가 있는 경우)
        if (barcode) {
          await ProductVariant.create({
            productId: product.id,
            size: sizeRaw.split(',')[0].trim(),
            color: colorRaw.split(',')[0].trim(),
            barcode
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
    const where = {};
    if (req.user.role === 'operator') {
      const user = await User.findByPk(req.user.id);
      where.company = user.company;
    }

    const products = await Product.findAll({
      where,
      include: [{
        model: ProductVariant,
        as: 'ProductVariants',
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

// ===== 의류 목록 엑셀 다운로드 =====
router.get('/export', auth, async (req,res)=>{
  try{
    const { company, wholesaler, search } = req.query;
    const where = {};

    // role-based restriction
    if(req.user.role==='operator'){
      const u = await User.findByPk(req.user.id);
      where.company = u.company;
    }else{
      if(company) where.company = company;
    }
    if(wholesaler) where.wholesaler = wholesaler;

    const include = [{
      model: ProductVariant,
      as: 'ProductVariants',
      attributes: ['id','size','color','barcode']
    }];

    if(search){
      const q = `%${search}%`;
      where[Op.or] = [
        { company:{ [Op.like]: q } },
        { productName:{ [Op.like]: q } },
        { wholesaler:{ [Op.like]: q } },
        { wholesalerProductName:{ [Op.like]: q } },
        { '$ProductVariants.barcode$': { [Op.like]: q } }
      ];
    }

    const products = await Product.findAll({ where, include, order:[['createdAt','DESC']] });

    // build rows
    const header = ['ID','업체','제품명','사이즈','컬러','바코드','도매처','도매처제품명','로케이션','등록일'];
    const rows = [];
    for(const p of products){
      if(p.ProductVariants && p.ProductVariants.length){
        for(const v of p.ProductVariants){
          rows.push([
            p.id,
            p.company,
            p.productName,
            v.size || (Array.isArray(p.size) ? p.size.join(',') : p.size),
            v.color || (Array.isArray(p.color) ? p.color.join(',') : p.color),
            v.barcode,
            p.wholesaler,
            p.wholesalerProductName,
            p.location,
            p.createdAt ? p.createdAt.toISOString().substring(0,10) : ''
          ]);
        }
      }else{
        rows.push([
          p.id,
          p.company,
          p.productName,
          Array.isArray(p.size)?p.size.join(','):p.size,
          Array.isArray(p.color)?p.color.join(','):p.color,
          '',
          p.wholesaler,
          p.wholesalerProductName,
          p.location,
          p.createdAt ? p.createdAt.toISOString().substring(0,10) : ''
        ]);
      }
    }

    const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'products');
    const buffer = xlsx.write(wb, { type:'buffer', bookType:'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buffer);
  }catch(err){
    console.error('product export error', err);
    return res.status(500).json({ message: err.message });
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

    /*───────────────────────────────────────────
     * 1) 바코드 서버측 검증
     *    - 빈 문자열/공백 → 제외
     *    - 요청 payload 내 중복 → 400 반환
     *    - 정제된 records 배열 반환
     *──────────────────────────────────────────*/
    const seen = new Set();
    const variantRecords = [];
    for (let idx = 0; idx < (variants || []).length; idx++) {
      const v = variants[idx];
      const barcode = (v.barcode || '').trim();
      if (!barcode) continue; // skip empty barcode rows

      if (seen.has(barcode)) {
        return res.status(400).json({
          message: `요청에 중복된 바코드가 있습니다: ${barcode} (index ${idx})`
        });
      }
      seen.add(barcode);

      variantRecords.push({
        productId: product.id,
        size: v.size ? v.size.trim() : null,
        color: v.color ? v.color.trim() : null,
        barcode
      });
    }

    if (variantRecords.length === 0) {
      return res
        .status(400)
        .json({ message: '바코드를 최소 1개 이상 입력해야 합니다.' });
    }

    await ProductVariant.bulkCreate(variantRecords);

    // 생성된 제품과 바리에이션 정보 반환
    const createdProduct = await Product.findByPk(product.id, {
      include: [{
        model: ProductVariant,
        as: 'ProductVariants',
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
    await ProductVariant.destroy({ where: { productId: product.id } });

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

    /*───────────────────────────────────────────
     * 바코드 검증 (POST와 동일 로직)
     *──────────────────────────────────────────*/
    const seen = new Set();
    const variantRecords = [];
    for (let idx = 0; idx < (variants || []).length; idx++) {
      const v = variants[idx];
      const barcode = (v.barcode || '').trim();
      if (!barcode) continue;
      if (seen.has(barcode)) {
        return res.status(400).json({
          message: `요청에 중복된 바코드가 있습니다: ${barcode} (index ${idx})`
        });
      }
      seen.add(barcode);

      variantRecords.push({
        productId: product.id,
        size: v.size ? v.size.trim() : null,
        color: v.color ? v.color.trim() : null,
        barcode
      });
    }

    if (variantRecords.length === 0) {
      return res
        .status(400)
        .json({ message: '바코드를 최소 1개 이상 입력해야 합니다.' });
    }

    await ProductVariant.bulkCreate(variantRecords);

    // 업데이트된 제품 정보 반환
    const updatedProduct = await Product.findByPk(product.id, {
      include: [{
        model: ProductVariant,
        as: 'ProductVariants',
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

module.exports = router; 