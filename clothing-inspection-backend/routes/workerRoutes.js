const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { auth } = require('../middleware/auth');
const Inspection = require('../models/inspection');
const InspectionDetail = require('../models/inspectionDetail');
const { ProductVariant } = require('../models/product');
const User = require('../models/user');
const ActivityLog = require('../models/ActivityLog');

// 작업자 대시보드 통계
router.get('/stats', auth, async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // MySQL CURDATE() 는 서버 시간대 기준 날짜를 반환하므로 타임존 문제를 피할 수 있다.
    const todayDateLiteral = Sequelize.literal('CURDATE()');

    // 확정(approved)된 전표만 대상으로 집계
    const [
      totalInspections,
      completedInspections,
      inProgressInspections,
      errorInspections,
      todayTotals,
      pastRemainQty,
      todayTotalInspections,
      todayCompletedInspections,
      todayInProgressInspections,
      pastPendingInspections
    ] = await Promise.all([
      // 전체 확정 전표
      Inspection.count({ where: { status: { [Op.in]: ['approved', 'completed'] } } }),
      // 완료된 전표 (작업까지 완료)
      Inspection.count({ where: { status: { [Op.in]: ['approved', 'completed'] }, workStatus: 'completed' } }),
      // 바코드 스캔이 진행 중인 전표
      Inspection.count({ where: { status: { [Op.in]: ['approved', 'completed'] }, workStatus: 'in_progress' } }),
      // 오류 상태 전표
      Inspection.count({ where: { status: { [Op.in]: ['approved', 'completed'] }, workStatus: 'error' } }),
      // 오늘의 총 수량과 처리된 수량 (전표 생성일이 오늘인 경우)
      InspectionDetail.findOne({
        attributes:[
          [Sequelize.fn('SUM', Sequelize.col('InspectionDetail.totalQuantity')), 'totalQuantity'],
          [Sequelize.literal('SUM(InspectionDetail.handledNormal + InspectionDetail.handledDefect + InspectionDetail.handledHold)'), 'handledQuantity']
        ],
        include:[{
          model: Inspection,
          attributes:[],
          where:{ status:{[Op.in]:['approved','completed']}, [Op.and]: Sequelize.where(Sequelize.fn('DATE', Sequelize.col('Inspection.createdAt')), todayDateLiteral) }
        }],
        raw:true
      }),
      // 지난 미완료 수량 (전일 이전 생성, 미완료 전표)
      InspectionDetail.findOne({
        attributes:[
          [Sequelize.literal('SUM(InspectionDetail.totalQuantity - InspectionDetail.handledNormal - InspectionDetail.handledDefect - InspectionDetail.handledHold)'), 'remainingQuantity']
        ],
        include:[{
          model: Inspection,
          attributes:[],
          where:{ status:{[Op.in]:['approved','completed']}, workStatus:{[Op.ne]:'completed'}, [Op.and]: Sequelize.literal('DATE(Inspection.createdAt) < CURDATE()') }
        }],
        raw:true
      }),
      // 오늘 전체 전표 수 (오늘 생성)
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, [Op.and]: Sequelize.literal('DATE(Inspection.createdAt)=CURDATE()') } }),
      // 오늘 완료 전표 수 (오늘 생성 + 작업 완료)
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:'completed', [Op.and]: Sequelize.literal('DATE(Inspection.createdAt)=CURDATE()') } }),
      // 오늘 진행중 전표 수 (오늘 생성 + 진행중)
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:'in_progress', [Op.and]: Sequelize.literal('DATE(Inspection.createdAt)=CURDATE()') } }),
      // 지난 미완료 전표 수
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:{ [Op.ne]:'completed' }, [Op.and]: Sequelize.literal('DATE(Inspection.createdAt) < CURDATE()') } })
    ]);

    const todayTotalQty = todayTotals ? parseInt(todayTotals.totalQuantity || 0, 10) : 0;
    const todayHandledQty = todayTotals ? parseInt(todayTotals.handledQuantity || 0, 10) : 0;
    const todayRemainingQty = todayTotalQty - todayHandledQty;

    const pastRemainingQty = pastRemainQty ? parseInt(pastRemainQty.remainingQuantity || 0, 10) : 0;

    res.json({
      totalInspections,
      completedInspections,
      inProgressInspections,
      errorInspections,
      todayScans: 0,
      todayErrors: 0,
      todayTotalQuantity: todayTotalQty,
      todayCompletedQuantity: todayHandledQty,
      todayRemainingQuantity: todayRemainingQty,
      pastRemainingQuantity: pastRemainingQty,
      todayTotalInspections,
      todayCompletedInspections,
      todayInProgressInspections,
      pastPendingInspections
    });
  } catch (err) {
    console.error('worker stats error', err);
    res.status(500).json({ message: err.message });
  }
});

// 작업자 전표 목록 (확정-미완료)
router.get('/inspections', auth, async (req, res) => {
  try {
    const list = await Inspection.findAll({
      where:{ status:'approved', workStatus:{ [Op.ne]:'completed' } },
      include:[{ model:User, as:'inspector', attributes:['id','username','name'] }],
      order:[[Sequelize.col('Inspection.updatedAt'),'DESC']]
    });
    res.json(list);
  } catch(err){
    console.error('worker inspections error', err);
    res.status(500).json({ message:err.message });
  }
});

// 바코드 스캔 처리
router.post('/scan', auth, async (req, res) => {
  try {
    const { detailId, barcode, result, qualityGrade } = req.body; // result: normal|defect|hold, optional qualityGrade
    if (!['normal','defect','hold'].includes(result)) {
      return res.status(400).json({ success:false, message:'잘못된 파라미터' });
    }
    if(!detailId && !barcode){
      return res.status(400).json({ success:false, message:'barcode 혹은 detailId 가 필요합니다.'});
    }
    let detail;
    if(detailId){
      detail = await InspectionDetail.findByPk(detailId, { include:[Inspection] });
      if(!detail) return res.status(404).json({ success:false, message:'detailId 가 올바르지 않습니다.'});
      if(detail.Inspection.status!=='approved' || detail.Inspection.workStatus==='completed'){
        return res.status(400).json({ success:false, message:'작업 불가한 전표입니다.'});
      }
    }else{
      const variant = await ProductVariant.findOne({ where:{ barcode } });
      if (!variant) return res.status(404).json({ success:false, message:'바코드를 찾을 수 없습니다.'});
      detail = await InspectionDetail.findOne({
        where:{ productVariantId: variant.id,
          [Op.and]: Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0') },
        include:[{
          model: Inspection,
          where:{ status:'approved', workStatus:{ [Op.ne]:'completed' } }
        }],
        order:[['createdAt','ASC']]
      });
    }
    if (!detail) return res.status(404).json({ success:false, message:'남은 수량이 있는 전표가 없습니다.'});

    // 업데이트
    const field = result === 'normal' ? 'handledNormal' : result==='defect' ? 'handledDefect' : 'handledHold';
    await detail.increment(field, { by:1 });

    // 품질등급 저장 요청이 있으면 업데이트
    if (qualityGrade) {
      await detail.update({ qualityGrade });
    }

    await detail.reload();

    const remaining = detail.totalQuantity - detail.handledNormal - detail.handledDefect - detail.handledHold;

    // 전표 상태 업데이트
    const insp = detail.Inspection || await Inspection.findByPk(detail.inspectionId);
    if (insp.workStatus === 'pending') await insp.update({ workStatus:'in_progress', assignedWorkerId:req.user.id });

    // 완료 체크
    const unfinished = await InspectionDetail.count({
      where:{ inspectionId: insp.id,
        [Op.and]: Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0') }
    });
    if (unfinished === 0) {
      await insp.update({ workStatus:'completed' });
      await ActivityLog.create({ inspectionId: insp.id, userId:req.user.id, type:'work_complete', message:'작업 완료', level:'info' });
    }

    res.json({ success:true, inspectionId: insp.id, detailId: detail.id, remaining, detail });
  } catch(err){
    console.error('scan error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// 바코드 조회(수량 확인만)
router.get('/barcode/:code', auth, async (req,res)=>{
  try{
    const variant = await ProductVariant.findOne({ where:{ barcode:req.params.code } });
    if (!variant) return res.status(404).json({ message:'바코드를 찾을 수 없습니다.'});

    // 해당 품목이 포함된 "확정·미완료" 전표 하나 찾기
    const targetDetail = await InspectionDetail.findOne({
      where:{ productVariantId: variant.id,
        [Op.and]: Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0') },
      include:[{ model: Inspection, where:{ status:'approved', workStatus:{[Op.ne]:'completed'} } }],
      order:[['createdAt','ASC']]
    });
    if (!targetDetail) return res.status(404).json({ message:'남은 수량이 있는 전표가 없습니다.'});

    const inspection = await Inspection.findByPk(targetDetail.inspectionId, {
      include:[{ model: InspectionDetail, include:[{ model: ProductVariant, as:'ProductVariant' }] }],
      order:[[InspectionDetail, 'createdAt','ASC']]
    });

    const details = inspection.InspectionDetails.map(d=>{
      const remaining = d.totalQuantity - d.handledNormal - d.handledDefect - d.handledHold;
      return { ...d.toJSON(), remaining, ProductVariant: d.ProductVariant };
    });

    res.json({ inspection, details });
  }catch(err){
    console.error('barcode lookup error', err);
    res.status(500).json({ message:err.message });
  }
});

// ------- 최근 활동 / 오류 보고 (간이 구현) -------

// 최근 활동 (향후 ActivityLog 테이블 구현 전까지 빈 배열 반환)
router.get('/recent-activity', auth, async (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 오류 보고 (workStatus = 'error' 인 전표)
router.get('/error-reports', auth, async (req, res) => {
  try {
    const errorInspections = await Inspection.findAll({
      where: { status: { [Op.in]: ['approved', 'completed'] }, workStatus: 'error' },
      attributes: ['id', 'inspectionName', 'company', 'workStatus', 'updatedAt']
    });
    res.json(errorInspections.map(i => ({
      id: i.id,
      inspectionNumber: i.inspectionName,
      note: '오류 발생',
      updatedAt: i.updatedAt
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 작업 완료 내역 (본인)
router.get('/history', auth, async (req, res) => {
  try {
    const list = await Inspection.findAll({
      where:{ status:{ [Op.in]: ['approved','completed'] }, workStatus:'completed', assignedWorkerId: req.user.id },
      include:[{ model: InspectionDetail }],
      order:[[Sequelize.col('Inspection.updatedAt'),'DESC']]
    });
    const result = [];
    for(const insp of list){
       const totalNormal = insp.InspectionDetails.reduce((t,d)=>t+d.handledNormal,0);
       const totalDefect = insp.InspectionDetails.reduce((t,d)=>t+d.handledDefect,0);
       const totalHold = insp.InspectionDetails.reduce((t,d)=>t+d.handledHold,0);
       const worker = await User.findByPk(insp.assignedWorkerId, { attributes:['id', ['username','name']] });
       result.push({ ...insp.toJSON(), totalNormal, totalDefect, totalHold, worker });
    }
    res.json(result);
  } catch(err){
    console.error('worker history error', err);
    res.status(500).json({ message: err.message });
  }
});

// 작업 완료 전표 삭제(되돌리기)
router.delete('/history/:id', auth, async (req,res)=>{
  try{
    const insp = await Inspection.findByPk(req.params.id, { include:[InspectionDetail] });
    if(!insp) return res.status(404).json({ message:'전표를 찾을 수 없습니다.'});
    if(insp.assignedWorkerId!==req.user.id) return res.status(403).json({ message:'권한이 없습니다.'});

    // reset handled counts
    for(const d of insp.InspectionDetails){
       await d.update({ handledNormal:0, handledDefect:0, handledHold:0 });
    }
    await insp.update({ workStatus:'pending', assignedWorkerId:null });
    res.json({ success:true });
  }catch(err){
    console.error('history delete error', err);
    res.status(500).json({ message: err.message });
  }
});

// 완료 전표 상세
router.get('/history/:id', auth, async (req,res)=>{
  try{
    const insp = await Inspection.findByPk(req.params.id, {
      include:[{ model: InspectionDetail, include:[{ model: ProductVariant, as:'ProductVariant' }] }]
    });
    if(!insp) return res.status(404).json({ message:'전표를 찾을 수 없습니다.'});
    if(insp.assignedWorkerId!==req.user.id) return res.status(403).json({ message:'권한이 없습니다.'});
    res.json(insp);
  }catch(err){
    console.error('history detail error', err);
    res.status(500).json({ message: err.message });
  }
});

// 상세 건수 수정
router.put('/history/details/:detailId', auth, async (req,res)=>{
  try{
    const { handledNormal, handledDefect, handledHold, qualityGrade } = req.body;
    const detail = await InspectionDetail.findByPk(req.params.detailId, { include:[Inspection] });
    if(!detail) return res.status(404).json({ message:'detail을 찾을 수 없습니다.'});
    if(detail.Inspection.assignedWorkerId!==req.user.id) return res.status(403).json({ message:'권한이 없습니다.'});

    await detail.update({ handledNormal, handledDefect, handledHold, qualityGrade });

    // 전표 완료 여부 다시 계산
    const insp = detail.Inspection;
    const remaining = await InspectionDetail.count({ where:{ inspectionId: insp.id,
      [Op.and]: Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0') } });
    if(remaining===0){
      await insp.update({ workStatus:'completed' });
    }else{
      await insp.update({ workStatus:'in_progress' });
    }
    res.json({ success:true, detail });
  }catch(err){
    console.error('history detail update error', err);
    res.status(500).json({ message: err.message });
  }
});

// 작업자 기간별 통계
router.get('/stats/summary', auth, async (req,res)=>{
  try{
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date();
    if(!start) startDate.setHours(0,0,0,0);
    const endDate = end ? new Date(end+'T23:59:59') : new Date();

    const baseInclude = [{ model: Inspection, attributes:[], where:{ assignedWorkerId:req.user.id, workStatus:{ [Op.in]: ['in_progress','completed'] } } }];

    // define reusable date between condition using fully-qualified column to avoid ambiguity
    const dateBetweenCondition = Sequelize.where(
      Sequelize.col('InspectionDetail.updatedAt'),
      { [Op.between]: [startDate, endDate] }
    );

    // 총합
    const totals = await InspectionDetail.findOne({
      include: baseInclude,
      where: dateBetweenCondition,
      attributes:[
        [Sequelize.fn('SUM', Sequelize.col('handledNormal')), 'totalNormal'],
        [Sequelize.fn('SUM', Sequelize.col('handledDefect')), 'totalDefect'],
        [Sequelize.fn('SUM', Sequelize.col('handledHold')), 'totalHold'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('inspectionId'))), 'totalSlips']
      ],
      raw:true
    });

    // 일자별
    const daily = await InspectionDetail.findAll({
      include: baseInclude,
      where: dateBetweenCondition,
      attributes:[
        [Sequelize.fn('DATE', Sequelize.col('InspectionDetail.updatedAt')), 'date'],
        [Sequelize.fn('SUM', Sequelize.col('handledNormal')), 'normal'],
        [Sequelize.fn('SUM', Sequelize.col('handledDefect')), 'defect'],
        [Sequelize.fn('SUM', Sequelize.col('handledHold')), 'hold'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('inspectionId'))), 'slips']
      ],
      group:[Sequelize.fn('DATE', Sequelize.col('InspectionDetail.updatedAt'))],
      order:[[Sequelize.literal('date'),'ASC']],
      raw:true
    });

    res.json({ ...totals, daily });
  }catch(err){
    console.error('summary stats error', err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------- 전표별 진행률 목록 ----------------
router.get('/progress', auth, async (req, res) => {
  try {
    // 오늘 이전에 완료된 전표는 제외: 완료가 아닌 전표는 항상, 완료 전표는 updatedAt >= 오늘만 포함
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const progressRows = await Inspection.findAll({
      where: {
        status: { [Op.in]: ['approved', 'completed'] },
        [Op.or]: [
          { workStatus: { [Op.ne]: 'completed' } },
          { workStatus: 'completed', updatedAt: { [Op.gte]: startOfToday } }
        ]
      },
      attributes: [
        'id',
        'inspectionName',
        'company',
        'workStatus',
        // 총 수량
        [Sequelize.fn('SUM', Sequelize.col('InspectionDetails.totalQuantity')), 'totalQuantity'],
        // 처리된 수량
        [Sequelize.literal('SUM(InspectionDetails.handledNormal + InspectionDetails.handledDefect + InspectionDetails.handledHold)'), 'handledCount']
      ],
      include: [{ model: InspectionDetail, attributes: [], as: 'InspectionDetails' }],
      group: ['Inspection.id'],
      order: [[Sequelize.col('Inspection.updatedAt'), 'DESC']],
      raw: true
    });

    const result = progressRows.map(row => {
      const total = parseInt(row.totalQuantity, 10) || 0;
      const handled = parseInt(row.handledCount, 10) || 0;
      const percent = total ? Math.round((handled / total) * 100) : 0;
      return {
        id: row.id,
        inspectionName: row.inspectionName,
        company: row.company,
        workStatus: row.workStatus,
        totalQuantity: total,
        handledCount: handled,
        percent
      };
    });

    res.json(result);
  } catch (err) {
    console.error('progress list error', err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------- 관리자: 작업자별 기간별 통계 ----------------
router.get('/stats/summary/all', auth, async (req,res)=>{
  try{
    // 관리자만 사용 가능
    if(req.user.role !== 'admin') {
      return res.status(403).json({ message:'관리자 권한이 필요합니다.'});
    }
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date();
    if(!start) startDate.setHours(0,0,0,0);
    const endDate = end ? new Date(end+'T23:59:59') : new Date();

    // 공통 where: Inspection 할당 작업자 있고 작업 상태가 in_progress/completed
    const baseInclude = [{
      model: Inspection,
      attributes: ['assignedWorkerId'],
      where:{ assignedWorkerId:{ [Op.ne]: null }, workStatus:{ [Op.in]: ['in_progress','completed'] } }
    }];

    // 날짜 조건 (updatedAt)
    const dateBetweenCondition = Sequelize.where(
      Sequelize.col('InspectionDetail.updatedAt'),
      { [Op.between]: [startDate, endDate] }
    );

    // 집계 쿼리
    const rows = await InspectionDetail.findAll({
      include: baseInclude,
      where: dateBetweenCondition,
      attributes:[
        [Sequelize.col('Inspection.assignedWorkerId'), 'workerId'],
        [Sequelize.fn('SUM', Sequelize.col('handledNormal')), 'totalNormal'],
        [Sequelize.fn('SUM', Sequelize.col('handledDefect')), 'totalDefect'],
        [Sequelize.fn('SUM', Sequelize.col('handledHold')), 'totalHold'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('inspectionId'))), 'totalSlips']
      ],
      group:['Inspection.assignedWorkerId'],
      raw:true
    });

    // 사용자 이름 매핑
    const userIds = rows.map(r=>r.workerId).filter(Boolean);
    const users = await User.findAll({ where:{ id:{ [Op.in]: userIds } }, attributes:['id','username'] });
    const userMap = {};
    users.forEach(u=>{ userMap[u.id] = u.username; });

    // 상세(작업자+전표별) 집계
    const slipRows = await InspectionDetail.findAll({
      include:[{
        model: Inspection,
        attributes:['assignedWorkerId','inspectionName'],
        where:{ assignedWorkerId:{ [Op.ne]: null }, workStatus:{ [Op.in]: ['in_progress','completed'] } }
      }],
      where: dateBetweenCondition,
      attributes:[
        [Sequelize.col('Inspection.assignedWorkerId'), 'workerId'],
        [Sequelize.col('Inspection.inspectionName'), 'inspectionName'],
        [Sequelize.fn('SUM', Sequelize.col('handledNormal')), 'normal'],
        [Sequelize.fn('SUM', Sequelize.col('handledDefect')), 'defect'],
        [Sequelize.fn('SUM', Sequelize.col('handledHold')), 'hold'],
        [Sequelize.fn('MIN', Sequelize.col('InspectionDetail.updatedAt')), 'firstScan'],
        [Sequelize.fn('MAX', Sequelize.col('InspectionDetail.updatedAt')), 'lastScan']
      ],
      group:['Inspection.assignedWorkerId','Inspection.inspectionName'],
      raw:true
    });

    let result = rows.map(r=>({
      workerId: r.workerId,
      workerName: userMap[r.workerId] || 'Unknown',
      totalNormal: parseInt(r.totalNormal || 0,10),
      totalDefect: parseInt(r.totalDefect || 0,10),
      totalHold: parseInt(r.totalHold || 0,10),
      totalSlips: parseInt(r.totalSlips || 0,10),
      slips: []
    }));

    // sort by 총 작업량 desc and assign rank
    result.forEach(r=>{ r.totalWork = r.totalNormal + r.totalDefect + r.totalHold; });
    result.sort((a,b)=> b.totalWork - a.totalWork);
    result.forEach((r,i)=>{ r.rank = i+1; });

    const byWorker = {};
    result.forEach(r=>{ byWorker[r.workerId]=r; });
    slipRows.forEach(s=>{
      const w = byWorker[s.workerId];
      if(w){
        w.slips.push({ inspectionName:s.inspectionName, normal:parseInt(s.normal||0,10), defect:parseInt(s.defect||0,10), hold:parseInt(s.hold||0,10), firstScan:s.firstScan, lastScan:s.lastScan });
      }
    });

    res.json(result);
  }catch(err){
    console.error('summary all stats error', err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------- 미확정(대기중·반려) 전표 목록 ----------------
router.get('/unconfirmed', auth, async (req, res) => {
  try {
    const list = await Inspection.findAll({
      where: { status: { [Op.in]: ['pending', 'rejected'] } },
      attributes: ['id', 'inspectionName', 'company', 'status', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    });
    res.json(list);
  } catch (err) {
    console.error('unconfirmed list error', err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------- 특정 전표 상세(스캔용) ----------------
router.get('/inspection/:id/details', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const inspection = await Inspection.findByPk(id, {
      include: [{
        model: InspectionDetail,
        include: [{ model: ProductVariant, as: 'ProductVariant' }],
        order: [['createdAt', 'ASC']]
      }]
    });
    if (!inspection) return res.status(404).json({ message: '전표를 찾을 수 없습니다.' });

    const details = inspection.InspectionDetails.map(d => {
      const remaining = d.totalQuantity - d.handledNormal - d.handledDefect - d.handledHold;
      return { ...d.toJSON(), remaining, ProductVariant: d.ProductVariant };
    });
    res.json({ inspection, details });
  } catch (err) {
    console.error('inspection details error', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 