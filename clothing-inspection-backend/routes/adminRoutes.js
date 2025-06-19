const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const Inspection = require('../models/inspection');
const InspectionDetail = require('../models/inspectionDetail');
const { Product, ProductVariant } = require('../models');
const User = require('../models/user');
const { auth } = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');
const { getSetting, setSetting } = require('../utils/settings');

// 관리자 통계 (기간 필터)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date('1970-01-01');
    const endDate = end ? new Date(end + 'T23:59:59') : new Date();

    // where for Inspection date
    const inspWhere = {
      createdAt: { [Op.between]: [startDate, endDate] },
      status: { [Op.in]: ['approved', 'completed'] }
    };

    // 도매처별 집계
    const wholesalerRows = await InspectionDetail.findAll({
      include: [{
        model: ProductVariant,
        attributes: [],
        include: [{ model: Product, as: 'product', attributes: [] }]
      }, {
        model: Inspection,
        attributes: [],
        where: inspWhere
      }],
      attributes: [
        [Sequelize.col('ProductVariant->product.wholesaler'), 'wholesaler'],
        [Sequelize.fn('SUM', Sequelize.col('InspectionDetail.totalQuantity')), 'inbound'],
        [Sequelize.fn('SUM', Sequelize.col('InspectionDetail.defectQuantity')), 'defect']
      ],
      group: ['ProductVariant->product.wholesaler'],
      raw: true
    });

    const wholesalerStats = wholesalerRows.map(r => {
      const inbound = parseInt(r.inbound || 0, 10);
      const defect = parseInt(r.defect || 0, 10);
      return {
        wholesaler: r.wholesaler || 'Unknown',
        inbound,
        defect,
        defectRate: inbound ? ((defect / inbound) * 100).toFixed(2) : '0.00'
      };
    });

    // 운영자(업체)별 집계
    const operatorRows = await InspectionDetail.findAll({
      include: [{ model: Inspection, attributes: ['company'], where: inspWhere }],
      attributes: [
        [Sequelize.col('Inspection.company'), 'company'],
        [Sequelize.fn('SUM', Sequelize.col('InspectionDetail.totalQuantity')), 'inbound'],
        [Sequelize.fn('SUM', Sequelize.col('InspectionDetail.defectQuantity')), 'defect']
      ],
      group: ['Inspection.company'],
      raw: true
    });

    const operatorStats = operatorRows.map(r => {
      const inbound = parseInt(r.inbound || 0, 10);
      const defect = parseInt(r.defect || 0, 10);
      return {
        company: r.company || 'Unknown',
        inbound,
        defect,
        defectRate: inbound ? ((defect / inbound) * 100).toFixed(2) : '0.00'
      };
    });

    // 요약 숫자
    const [skuCnt, workerCnt, inspectorCnt, operatorCnt] = await Promise.all([
      ProductVariant.count(),
      User.count({ where: { role: 'worker' } }),
      User.count({ where: { role: 'inspector' } }),
      User.count({ where: { role: 'operator' } })
    ]);

    res.json({
      wholesalerStats,
      operatorStats,
      summary: {
        totalSkus: skuCnt,
        workerCount: workerCnt,
        inspectorCount: inspectorCnt,
        operatorCount: operatorCnt
      }
    });
  } catch (err) {
    console.error('admin overview error', err);
    res.status(500).json({ message: err.message });
  }
});

// ===== 활동 로그 =====
router.get('/activity', auth, async (req, res)=>{
  try{
    if(req.user.role!=='admin') return res.status(403).json({ message:'관리자 권한 필요' });
    const { start, end, level } = req.query;
    const startDate = start ? new Date(start) : new Date('1970-01-01');
    const endDate = end ? new Date(end+'T23:59:59') : new Date();

    const where = { createdAt:{ [Op.between]:[startDate,endDate] } };
    if(level) where.level = level;

    const logs = await ActivityLog.findAll({
      where,
      include:[
        { model: Inspection, attributes:['inspectionName'] },
        { model: User, attributes:['id','username'] }
      ],
      order:[['createdAt','DESC']]
    });

    res.json(logs.map(l=>({
      id:l.id,
      createdAt:l.createdAt,
      level:l.level,
      type:l.type,
      message:l.message,
      inspectionName:l.Inspection?.inspectionName||null,
      user:l.User?.username||null
    })));
  }catch(err){
    console.error('activity list error', err);
    res.status(500).json({ message:err.message });
  }
});

// ===== 미확정·작업 지연 전표 =====
router.get('/alerts', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.status(403).json({ message:'관리자 권한 필요' });
    const delayDays = parseInt(req.query.delayDays||2,10); // 기본 2일
    const delayDate = new Date(Date.now() - delayDays*24*60*60*1000);

    const unconfirmed = await Inspection.findAll({ where:{ status:{ [Op.in]:['pending','rejected'] } }, attributes:['id','inspectionName','company','status','updatedAt']});
    const delayed = await Inspection.findAll({
      where:{ status:{ [Op.in]:['approved','completed'] }, workStatus:{ [Op.ne]:'completed' }, createdAt:{ [Op.lt]: delayDate } },
      attributes:['id','inspectionName','company','workStatus','createdAt']
    });
    res.json({ unconfirmed, delayed });
  }catch(err){ console.error('alerts error', err); res.status(500).json({ message:err.message }); }
});

// ===== 시스템 설정: 이메일 From =====
router.get('/settings/email-from', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({ message:'관리자 권한 필요' });
  try{
    const val = await getSetting('emailFrom');
    res.json({ emailFrom: val });
  }catch(err){ res.status(500).json({ message: err.message }); }
});

router.put('/settings/email-from', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({ message:'관리자 권한 필요' });
  const { emailFrom } = req.body;
  if(!emailFrom) return res.status(400).json({ message:'emailFrom required' });
  try{
    await setSetting('emailFrom', emailFrom);
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message: err.message }); }
});

module.exports = router; 