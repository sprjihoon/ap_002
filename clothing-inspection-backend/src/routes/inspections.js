const express = require('express');
const router = express.Router();
const { Inspection, InspectionReceiptPhoto, ProductVariant, Product } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 검수 전표명 생성 함수
const generateInspectionSlipName = (company) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const version = String(date.getHours()).padStart(2, '0') + String(date.getMinutes()).padStart(2, '0');
  return `${company}_${year}${month}${day}_${version}`;
};

// 검수 등록 API
router.post('/', async (req, res) => {
  try {
    const { company, products, options, receiptPhotos } = req.body;
    
    // 검수 전표명 생성
    const inspectionSlipName = generateInspectionSlipName(company);
    
    // 검수 데이터 생성
    const inspection = await Inspection.create({
      inspectionSlipName,
      company,
      status: 'pending'
    });

    // 옵션별 검수 데이터 생성
    for (const [barcode, data] of Object.entries(options)) {
      const variant = await ProductVariant.findOne({ where: { barcode } });
      if (!variant) continue;

      await inspection.createInspectionDetail({
        productVariantId: variant.id,
        totalQuantity: data.total,
        normalQuantity: data.normal,
        defectQuantity: data.defect,
        result: data.result,
        comment: data.comment,
        photoUrl: data.photoUrl
      });
    }

    // 영수증/증빙 사진 데이터 생성
    if (receiptPhotos && receiptPhotos.length > 0) {
      for (const photo of receiptPhotos) {
        await inspection.createInspectionReceiptPhoto({
          photoUrl: photo.url,
          description: photo.description
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        inspectionSlipName,
        inspectionId: inspection.id
      }
    });
  } catch (error) {
    console.error('검수 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: '검수 등록 중 오류가 발생했습니다.'
    });
  }
});

// 검수 목록 조회 API
router.get('/', async (req, res) => {
  try {
    const inspections = await Inspection.findAll({
      include: [
        {
          model: InspectionDetail,
          include: [ProductVariant]
        },
        InspectionReceiptPhoto
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: inspections
    });
  } catch (error) {
    console.error('검수 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '검수 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 검수 상세 조회 API
router.get('/:id', async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        {
          model: InspectionDetail,
          include: [{
            model: ProductVariant,
            include: [{
              model: Product,
              attributes: ['productName']
            }]
          }]
        },
        InspectionReceiptPhoto
      ]
    });

    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: '검수 정보를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: inspection
    });
  } catch (error) {
    console.error('검수 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: '검수 상세 조회 중 오류가 발생했습니다.'
    });
  }
});

// 검수 승인 API
router.put('/:id/approve', async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: '검수 정보를 찾을 수 없습니다.'
      });
    }

    if (inspection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '대기중인 검수만 승인할 수 있습니다.'
      });
    }

    await inspection.update({
      status: 'approved',
      approvedAt: new Date()
    });

    res.json({
      success: true,
      data: inspection
    });
  } catch (error) {
    console.error('검수 승인 실패:', error);
    res.status(500).json({
      success: false,
      error: '검수 승인 중 오류가 발생했습니다.'
    });
  }
});

// 검수 반려 API
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '반려 사유를 입력해주세요.'
      });
    }

    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        error: '검수 정보를 찾을 수 없습니다.'
      });
    }

    if (inspection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '대기중인 검수만 반려할 수 있습니다.'
      });
    }

    await inspection.update({
      status: 'rejected',
      rejectReason: reason,
      rejectedAt: new Date()
    });

    res.json({
      success: true,
      data: inspection
    });
  } catch (error) {
    console.error('검수 반려 실패:', error);
    res.status(500).json({
      success: false,
      error: '검수 반려 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 