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
const InspectionDetail = require('../models/inspectionDetail');
const { Product, ProductVariant } = require('../models/product');
const { sendEmail } = require('../utils/email');
const PDFDocument = require('pdfkit');
const { InspectionComment } = require('../models');
const InspectionRead = require('../models/inspectionRead');
const ActivityLog = require('../models/ActivityLog');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

// 모든 검수 내역 조회
router.get('/', auth, async (req, res) => {
  try {
    // 운영자는 본인 업체 데이터만 조회
    let where = {};
    if (req.user.role === 'operator') {
      const user = await User.findByPk(req.user.id);
      where.company = user.company;
    }

    const inspectionsRaw = await Inspection.findAll({
      where,
      include: [
        {
          model: InspectionDetail,
          include: [{
            model: ProductVariant,
            include: [{ model: Product, as: 'product' }]
          }]
        },
        InspectionReceiptPhoto,
        {
          model: InspectionComment,
          as: 'comments',
          include:[
            { model: User, attributes:['id', ['username', 'name'], 'role'] },
            { model: InspectionComment, as:'replies', include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }] }
          ]
        },
        { model: User, as:'inspector', attributes:['id', ['username','name'], 'role'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    const inspections = [];
    for (const ins of inspectionsRaw) {
      const latestCommentAt = ins.comments && ins.comments.length > 0 ? Math.max(...ins.comments.map(c=>new Date(c.createdAt))) : null;
      const lastActivity = latestCommentAt ? new Date(Math.max(new Date(ins.updatedAt), latestCommentAt)) : new Date(ins.updatedAt);
      const readRec = await InspectionRead.findOne({ where: { inspectionId: ins.id, userId: req.user.id } });
      const hasNew = !readRec || new Date(readRec.lastViewedAt) < lastActivity;
      ins.dataValues.hasNew = hasNew;
      inspections.push(ins);
    }

    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 새 검수 내역 등록
router.post('/', auth, async (req, res) => {
  try {
    const { inspectionName: reqName, company, result, comment, details, receiptPhotos } = req.body;

    // 기본 전표명: 회사_YYYYMMDD
    const now = new Date();
    const baseDate = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
    const baseName = `${company}_${baseDate}`;

    // 프런트에서 보내온 이름이 있으면 사용하되 시간/밀리초 제거
    let baseCandidate = reqName ? reqName.split('_')[0]===company ? reqName : baseName : baseName;
    if(baseCandidate.includes('_')){
      // strip trailing _HHMM... if exists
      const parts = baseCandidate.split('_');
      if(parts.length>2){
        baseCandidate = `${parts[0]}_${parts[1]}`;
      }
    }

    // 중복 체크
    let finalName = baseCandidate;
    const existingCount = await Inspection.count({ where:{ inspectionName: { [Op.like]: `${baseCandidate}%` } } });
    if(existingCount>0){
      finalName = `${baseCandidate}_${existingCount}`; // 첫 중복은 _1
      // 중복 이름이 이미 존재한다면 숫자 증가
      while(await Inspection.findOne({ where:{ inspectionName: finalName } })){
        const parts = finalName.split('_');
        const lastNum = parseInt(parts.pop(),10);
        const nextNum = isNaN(lastNum)? existingCount : lastNum + 1;
        finalName = `${baseCandidate}_${nextNum}`;
      }
    }

    const inspection = await Inspection.create({
      inspectionName: finalName,
      company,
      result,
      comment,
      status: 'pending',
      inspector_id: req.user.id
    });

    await ActivityLog.create({ inspectionId: inspection.id, userId: req.user.id, type:'create', message:`전표 생성 (${inspection.inspectionName})`, level:'info' });

    // 상세 항목이 있으면 저장
    if (Array.isArray(details) && details.length > 0) {
      const detailRecords = [];
      for (const d of details) {
        // barcode 로 ProductVariant 찾기 (고유)
        const variant = await ProductVariant.findOne({ where: { barcode: d.barcode } });
        if (!variant) {
          // 변형을 찾지 못하면 건너뛰거나 오류 처리
          console.warn('Variant not found for barcode', d.barcode);
          continue;
        }
        detailRecords.push({
          inspectionId: inspection.id,
          productVariantId: variant.id,
          totalQuantity: d.totalQuantity,
          normalQuantity: d.normalQuantity,
          defectQuantity: d.defectQuantity,
          result: d.result,
          comment: d.comment || null,
          photoUrl: d.photoUrl || null
        });
      }
      if (detailRecords.length > 0) {
        await InspectionDetail.bulkCreate(detailRecords);
      }
    }

    // 영수증/증빙 사진 기록
    if (Array.isArray(receiptPhotos) && receiptPhotos.length > 0) {
      const photoRecords = receiptPhotos.map(p => ({
        inspectionId: inspection.id,
        photoUrl: p.url,
        description: p.description || null
      }));
      await InspectionReceiptPhoto.bulkCreate(photoRecords);
    }

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
    // 작성자(inspector) 또는 관리자만 수정 가능
    if (req.user.role !== 'admin' && req.user.id !== inspection.inspector_id) {
      return res.status(403).json({ message:'수정 권한이 없습니다.' });
    }
    await inspection.update(req.body);
    res.json(inspection);
  } catch (error) {
    console.error('Inspection PUT error:', error);
    res.status(400).json({ message: error.message });
  }
});

// 검수 승인
router.put('/:id/approve', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'operator' && req.user.id !== inspection.inspector_id) {
        return res.status(403).json({ success:false, message:'승인 권한이 없습니다.'});
      }
    }
    await inspection.update({ status: 'approved', rejectReason: null });

    await ActivityLog.create({ inspectionId: inspection.id, userId: req.user.id, type:'status_change', message:`전표 승인`, level:'info' });

    // 승인 후 해당 업체 운영자에게 이메일 전송
    try {
      const operators = await User.findAll({ where: { role: 'operator', company: inspection.company } });
      const emails = operators.map(o => o.email).filter(Boolean);
      if (emails.length) {
        await sendEmail({
          to: emails,
          subject: '의류 검수 완료 안내',
          text: '의류 검수가 완료되었습니다.'
        });
      }
    } catch (mailErr) {
      console.error('Failed to send email:', mailErr);
    }

    res.json({ success: true, message: '검수가 승인되었습니다.' });
  } catch (error) {
    console.error('Inspection approve error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 검수 반려
router.put('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'operator' && req.user.id !== inspection.inspector_id) {
        return res.status(403).json({ success:false, message:'반려 권한이 없습니다.'});
      }
    }
    await inspection.update({ status: 'rejected', rejectReason: reason || null });

    await ActivityLog.create({ inspectionId: inspection.id, userId: req.user.id, type:'status_change', message:`전표 반려: ${reason||''}`, level:'warn' });

    res.json({ success: true, message: '검수가 반려되었습니다.' });
  } catch (error) {
    console.error('Inspection reject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ------ 상태: 대기중(pending) ------
router.put('/:id/pending', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success:false, message:'검수 전표를 찾을 수 없습니다.'});
    }
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'operator' && req.user.id !== inspection.inspector_id) {
        return res.status(403).json({ success:false, message:'상태 변경 권한이 없습니다.'});
      }
    }
    await inspection.update({ status:'pending', rejectReason:null });

    await ActivityLog.create({ inspectionId: inspection.id, userId: req.user.id, type:'status_change', message:`전표를 대기중으로 되돌림`, level:'info' });

    res.json({ success:true, message:'대기중 상태로 변경되었습니다.'});
  } catch(err){
    console.error('Inspection pending error:', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// 업로드 폴더 생성
const uploadDir = path.join(__dirname, '..', 'uploads', 'inspection_receipts');
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
router.post('/:inspectionId/receipt-photo', auth, upload.single('file'), async (req, res) => {
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
      photoUrl: `/uploads/inspection_receipts/${req.file.filename}`
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

// 검수 상세(InspectionDetail) 수정
router.put('/details/:detailId', auth, async (req, res) => {
  try {
    const detail = await InspectionDetail.findByPk(req.params.detailId);
    if (!detail) {
      return res.status(404).json({ success: false, message: '검수 상세를 찾을 수 없습니다.' });
    }
    // 상위 Inspection 가져와 권한 체크
    const inspection = await Inspection.findByPk(detail.inspectionId);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }
    // 작성자 또는 관리자만 수정 가능
    if (req.user.role !== 'admin' && req.user.id !== inspection.inspector_id) {
      return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
    }

    const { totalQuantity, normalQuantity, defectQuantity, result, comment, photoUrl } = req.body;
    await detail.update({ totalQuantity, normalQuantity, defectQuantity, result, comment, photoUrl });

    res.json({ success: true, message: '검수 상세가 수정되었습니다.', detail });
  } catch (error) {
    console.error('Inspection detail update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 검수 상세(InspectionDetail) 삭제
router.delete('/details/:detailId', auth, async (req, res) => {
  try {
    const detail = await InspectionDetail.findByPk(req.params.detailId);
    if (!detail) {
      return res.status(404).json({ success: false, message: '검수 상세를 찾을 수 없습니다.' });
    }

    const inspection = await Inspection.findByPk(detail.inspectionId);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }

    if (req.user.role !== 'admin' && req.user.id !== inspection.inspector_id) {
      return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
    }

    await detail.destroy();
    res.json({ success: true, message: '검수 상세 항목이 삭제되었습니다.' });
  } catch (error) {
    console.error('Inspection detail delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== 댓글(Comment) =====  (등록/목록) - *generic :id route보다 앞에 위치해야 함*

// 댓글 목록
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include:[{
        model: InspectionComment,
        as:'comments',
        include:[
          { model: User, attributes:['id', ['username', 'name'], 'role'] },
          { model: InspectionComment, as:'replies', include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }] }
        ],
        order:[['createdAt','ASC']]
      }]
    });
    if (!inspection) return res.status(404).json({ success:false, message:'검수 전표를 찾을 수 없습니다.'});
    res.json({ success:true, comments: inspection.comments });
  } catch(err){
    console.error('comment list error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// 댓글 작성 (관리자,검수자만)
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success:false, message:'내용이 필요합니다.'});

    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success:false, message:'검수 전표를 찾을 수 없습니다.'});

    const comment = await InspectionComment.create({
      inspectionId: inspection.id,
      userId: req.user.id,
      content
    });

    const commentWithUser = await InspectionComment.findByPk(comment.id, { include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }]});

    res.status(201).json({ success:true, comment: commentWithUser });
  } catch(err){
    console.error('comment post error', err);
    res.status(500).json({ success:false, message: err.message });
  }
});

// 댓글 수정
router.put('/comments/:commentId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await InspectionComment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success:false, message:'댓글을 찾을 수 없습니다.'});

    // 권한: 작성자 또는 관리자
    if (req.user.role !== 'admin' && req.user.id !== comment.userId) {
      return res.status(403).json({ success:false, message:'수정 권한이 없습니다.'});
    }

    await comment.update({ content });
    const updated = await InspectionComment.findByPk(comment.id, { include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }]});
    res.json({ success:true, comment: updated });
  } catch(err){
    console.error('comment update error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// 댓글 삭제
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await InspectionComment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ success:false, message:'댓글을 찾을 수 없습니다.'});

    if (req.user.role !== 'admin' && req.user.id !== comment.userId) {
      return res.status(403).json({ success:false, message:'삭제 권한이 없습니다.'});
    }

    await comment.destroy();
    res.json({ success:true, message:'삭제되었습니다.'});
  } catch(err){
    console.error('comment delete error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// 댓글 답글 작성
router.post('/comments/:commentId/replies', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const parent = await InspectionComment.findByPk(req.params.commentId);
    if (!parent) return res.status(404).json({ success:false, message:'원본 댓글을 찾을 수 없습니다.'});

    if (!content) return res.status(400).json({ success:false, message:'내용이 필요합니다.'});

    const reply = await InspectionComment.create({
      inspectionId: parent.inspectionId,
      userId: req.user.id,
      parentCommentId: parent.id,
      content
    });

    const replyWithUser = await InspectionComment.findByPk(reply.id, { include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }]});
    res.status(201).json({ success:true, comment: replyWithUser });
  } catch(err){
    console.error('reply post error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        {
          model: InspectionDetail,
          include: [{
            model: ProductVariant,
            include: [{ model: Product, as: 'product' }]
          }]
        },
        InspectionReceiptPhoto,
        {
          model: InspectionComment,
          as: 'comments',
          include:[
            { model: User, attributes:['id', ['username', 'name'], 'role'] },
            { model: InspectionComment, as:'replies', include:[{ model: User, attributes:['id', ['username', 'name'], 'role'] }] }
          ]
        }
      ]
    });
    if (!inspection) {
      return res.status(404).json({ success:false, message:'검수 전표를 찾을 수 없습니다.'});
    }
    // mark as read
    await InspectionRead.upsert({ inspectionId: inspection.id, userId: req.user.id, lastViewedAt: new Date() });

    res.json({ success:true, data: inspection });
  } catch (error) {
    console.error('Inspection detail error:', error);
    res.status(500).json({ success:false, message: error.message });
  }
});

// 검수 삭제 (관리자 또는 작성자)
router.delete('/:id', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }
    // 작성자 본인 또는 관리자만 삭제 허용
    if (req.user.role !== 'admin' && req.user.id !== inspection.inspector_id) {
      return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
    }

    await inspection.destroy(); // cascade 로 상세/사진 함께 삭제
    res.json({ success: true, message: '검수 전표가 삭제되었습니다.' });
  } catch (error) {
    console.error('Inspection delete error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 운영자 코멘트 수정 전용
router.put('/:id/comment', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: '검수 전표를 찾을 수 없습니다.' });
    }
    // 운영자만 가능하며 본인 업체인지 확인
    const user = await User.findByPk(req.user.id);
    if (req.user.role !== 'operator' || user.company !== inspection.company) {
      return res.status(403).json({ success: false, message: '코멘트 수정 권한이 없습니다.' });
    }

    await inspection.update({ comment, status: 'pending' });
    res.json({ success: true, message: '코멘트가 수정되었습니다.', inspection });
  } catch (error) {
    console.error('Comment update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====== PDF 다운로드 =====
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id, {
      include: [
        {
          model: InspectionDetail,
          include: [{
            model: ProductVariant,
            include: [{ model: Product, as: 'product' }]
          }]
        },
        InspectionReceiptPhoto
      ]
    });

    if (!inspection) {
      return res.status(404).json({ message: '검수 전표를 찾을 수 없습니다.' });
    }

    // 권한 체크
    const user = await User.findByPk(req.user.id);
    const isOwner = user.id === inspection.inspector_id;
    if (req.user.role === 'operator' && user.company !== inspection.company) {
      return res.status(403).json({ message: '열람 권한이 없습니다.' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'operator' && !isOwner) {
      return res.status(403).json({ message: '열람 권한이 없습니다.' });
    }

    // PDF 생성
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = encodeURIComponent(inspection.inspectionName || `inspection-${inspection.id}`) + '.pdf';
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    doc.pipe(res);

    doc.fontSize(20).text('검수 전표', { align: 'center' });
    doc.moveDown();

    const addField = (label, value) => {
      doc.fontSize(12).text(`${label}: ${value}`);
    };

    addField('검수전표명', inspection.inspectionName);
    addField('업체', inspection.company);
    addField('검수일시', new Date(inspection.createdAt).toLocaleString());
    addField('상태', inspection.status);
    addField('결과', inspection.result);
    if (inspection.comment) addField('코멘트', inspection.comment);

    doc.moveDown();
    doc.fontSize(14).text('상세 항목', { underline: true });
    doc.moveDown(0.5);

    inspection.InspectionDetails.forEach((d, idx) => {
      doc.fontSize(12).text(`${idx + 1}. ${d.ProductVariant?.product?.productName} / ${d.ProductVariant?.size || ''} / ${d.ProductVariant?.color || ''} / ${d.ProductVariant?.barcode}`);
      doc.text(`   전체: ${d.totalQuantity}, 정상: ${d.normalQuantity}, 불량: ${d.defectQuantity}, 결과: ${d.result}`);
      if (d.comment) doc.text(`   코멘트: ${d.comment}`);
      doc.moveDown(0.35);
    });

    doc.end();
  } catch (err) {
    console.error('PDF 생성 오류:', err);
    res.status(500).json({ message: err.message });
  }
});

// EZ-Admin 엑셀 양식 다운로드
router.get('/:id/ez-admin-xlsx', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const inspection = await Inspection.findByPk(id, {
      include: [{
        model: InspectionDetail,
        include: [{
          model: ProductVariant,
          include: [{ model: Product, as: 'product' }]
        }]
      }]
    });

    if (!inspection) {
      return res.status(404).json({ message: '검수 전표를 찾을 수 없습니다.' });
    }

    // 시트 데이터 구성 (EZ-Admin 업로드 양식 A~H 컬럼)
    const header = [
      '상품코드/바코드(택1)', // A
      '작업수량',            // B
      '요청수량',            // C
      '로케이션',            // D
      '유통기한',            // E
      '로트번호',           // F
      '제조번호',           // G
      '재고메모'             // H
    ];

    const dataRows = inspection.InspectionDetails.map(detail => {
      const product = detail.ProductVariant?.product;
      return [
        detail.ProductVariant?.barcode || '',                                         // A 상품코드/바코드
        detail.totalQuantity ?? '',                                                   // B 작업수량
        detail.totalQuantity ?? '',                                                   // C 요청수량 (기본 동일 값)
        product?.location || '',                                                      // D 로케이션
        '',                                                                           // E 유통기한 (미정)
        '',                                                                           // F 로트번호 (없음)
        '',                                                                           // G 제조번호 (없음)
        detail.comment || ''                                                          // H 재고메모
      ];
    });

    const aoa = [header, ...dataRows];
    const ws = xlsx.utils.aoa_to_sheet(aoa);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'EZ-Admin');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(inspection.inspectionName)}_ez_admin.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('EZ-Admin XLSX download error:', err);
    return res.status(500).json({ message: err.message || '내부 서버 오류' });
  }
});

module.exports = router; 