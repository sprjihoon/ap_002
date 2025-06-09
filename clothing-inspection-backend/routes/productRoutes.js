const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');
const { Product, User, ProductVariant } = require('../models');

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

module.exports = router; 