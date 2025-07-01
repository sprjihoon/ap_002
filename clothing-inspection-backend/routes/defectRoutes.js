const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { auth } = require('../middleware/auth');
const InspectionDetail = require('../models/inspectionDetail');
const Inspection = require('../models/inspection');
const { ProductVariant, Product } = require('../models');
const User = require('../models/user');

// GET /api/defects  - 불량 내역 목록 (기간 필터 optional)
router.get('/', auth, async (req, res)=>{
  try{
    // allow operator / inspector / admin
    const role = req.user.role;
    if(!['admin','inspector','operator'].includes(role)){
      return res.status(403).json({ message:'접근 권한이 없습니다.'});
    }
    const { start, end, company, inspectorId, workerId, q } = req.query;
    let dateCond = {};
    if(start||end){
      const startDate = start ? new Date(start) : new Date('1970-01-01');
      const endDate = end ? new Date(end+'T23:59:59') : new Date();
      dateCond = { createdAt:{ [Op.between]: [startDate, endDate] } };
    }

    const where = {
      [Op.and]: [
        { [Op.or]: [
          { defectQuantity:{ [Op.gt]: 0 } },
          { handledDefect:{ [Op.gt]: 0 } }
        ] },
        dateCond
      ]
    };

    // build dynamic where/ include filters
    if(company) {
      where[Op.and].push({ '$Inspection.company$': company });
    }
    if(inspectorId) {
      where[Op.and].push({ '$Inspection.inspector_id$': inspectorId });
    }
    if(workerId) {
      where[Op.and].push({ '$Inspection.assignedWorkerId$': workerId });
    }

    // operator role restriction
    if(role==='operator' && req.user.company){
      where[Op.and].push({ '$Inspection.company$': req.user.company });
    }

    const list = await InspectionDetail.findAll({
      where,
      include:[
        { model: Inspection, as: 'Inspection', attributes:['id','inspectionName','company','inspector_id','assignedWorkerId'],
          include:[{ model: User, as:'inspector', attributes:['id','username','company'] }] },
        { model: ProductVariant, as:'ProductVariant', attributes:['id','barcode'], include:[{ model: Product, as:'product', attributes:['productName','wholesaler'] }] }
      ],
      order:[[Sequelize.col('InspectionDetail.updatedAt'),'DESC']]
    });

    // fetch worker names in bulk
    const workerIds = [...new Set(list.map(d=>d.Inspection?.assignedWorkerId).filter(Boolean))];
    const workers = await User.findAll({ where:{ id:{ [Op.in]: workerIds } }, attributes:['id','username'] });
    const workerMap = {}; workers.forEach(w=>{ workerMap[w.id]=w.username; });

    const searchLower = (q||'').toLowerCase();

    const result = list.filter(d=>{
      if(!q) return true;
      const candidate = [
        d.ProductVariant?.product?.productName,
        d.ProductVariant?.barcode,
        d.Inspection?.inspectionName,
        d.Inspection?.company
      ].join(' ').toLowerCase();
      return candidate.includes(searchLower);
    }).map(d=>({
      id:d.id,
      inspectionId:d.inspectionId,
      inspectionName: d.Inspection?.inspectionName,
      company: d.Inspection?.company,
      productName: d.ProductVariant?.product?.productName,
      wholesaler: d.ProductVariant?.product?.wholesaler,
      barcode: d.ProductVariant?.barcode,
      defectQuantity: d.defectQuantity,
      handledDefect: d.handledDefect,
      inspectorId: d.Inspection?.inspector_id || null,
      inspectorName: d.Inspection?.inspector?.username || null,
      workerId: d.Inspection?.assignedWorkerId || null,
      workerName: workerMap[d.Inspection?.assignedWorkerId] || null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    res.json(result);
  }catch(err){
    console.error('defect list error', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 