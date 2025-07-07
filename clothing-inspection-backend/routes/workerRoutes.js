const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { auth } = require('../middleware/auth');
const Inspection = require('../models/inspection');
const InspectionDetail = require('../models/inspectionDetail');
const { ProductVariant, WorkerScan } = require('../models');
const User = require('../models/user');
const ActivityLog = require('../models/ActivityLog');
const path = require('path');

// 바코드 앞쪽 0 제거 (스캐너마다 0-padding 차이 대응)
const stripZero = code => code.replace(/^0+/, '');

// 작업자 대시보드 통계
router.get('/stats', auth, async (req, res) => {
  try {
    // ----- 한국 시간(KST, UTC+9) 기준으로 오늘 날짜 경계 계산 -----
    // 서버와 DB 가 UTC 로 동작하더라도 createdAt(UTC) 을 정확히 비교하기 위함.
    const nowUtc = new Date();
    const kstOffsetMs = 9 * 60 * 60 * 1000; // +09:00
    const kstNow = new Date(nowUtc.getTime() + kstOffsetMs);

    // kstNow 의 연-월-일을 이용해 KST 자정(00:00)과 23:59:59 을 UTC 로 환산
    const kstYear = kstNow.getUTCFullYear();
    const kstMonth = kstNow.getUTCMonth();
    const kstDate = kstNow.getUTCDate();

    const startOfKstUtc = new Date(Date.UTC(kstYear, kstMonth, kstDate, 0, 0, 0));
    const endOfKstUtc   = new Date(Date.UTC(kstYear, kstMonth, kstDate, 23, 59, 59, 999));

    // 편의 상수: "오늘" 구간과 "지난" 구간 필터
    const todayRange = { [Op.between]: [startOfKstUtc, endOfKstUtc] };
    const pastRange  = { [Op.lt]: startOfKstUtc };

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
          as: 'Inspection',
          attributes:[],
          where:{ status:{[Op.in]:['approved','completed']}, createdAt: todayRange }
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
          as: 'Inspection',
          attributes:[],
          where:{ status:{[Op.in]:['approved','completed']}, workStatus:{[Op.ne]:'completed'}, createdAt: pastRange }
        }],
        raw:true
      }),
      // 오늘 전체 전표 수 (오늘 생성, 모든 status)
      Inspection.count({ where: { createdAt: todayRange } }),
      // 오늘 완료 전표 수 (오늘 생성 + 작업 완료)
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:'completed', createdAt: todayRange } }),
      // 오늘 진행중 전표 수 (오늘 생성 + 진행중)
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:'in_progress', createdAt: todayRange } }),
      // 지난 미완료 전표 수
      Inspection.count({ where:{ status:{[Op.in]:['approved','completed']}, workStatus:{ [Op.ne]:'completed' }, createdAt: pastRange } })
    ]);

    // ---------------------------------------------------------------------
    // KST 기준 집계 결과 정리
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
  } catch(err){
    console.error('worker stats error', err);
    res.status(500).json({ message: err.message });
  }
});

// 작업자 전표 목록 (확정-미완료)
router.get('/inspections', auth, async (req, res) => {
  try {
    const list = await Inspection.findAll({
      where:{ status:'approved', workStatus:{ [Op.ne]:'completed' } },
      include:[{ model:User, as:'inspector', attributes:['id','username'] }],
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
      detail = await InspectionDetail.findByPk(detailId, { include:[{ model: Inspection, as:'Inspection' }] });
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

    await detail.reload({ include:[{ model: Inspection, as:'Inspection' }] });

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

    // 완료 체크 이후
    await WorkerScan.create({
      inspectionId: detail.inspectionId,
      detailId: detail.id,
      userId: req.user.id,
      result,
      qualityGrade: qualityGrade || null
    });

    res.json({ success:true, inspectionId: insp.id, detailId: detail.id, remaining, detail });
  } catch(err){
    console.error('scan error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// ---------- 스캔 취소(undo) ----------
router.post('/scan/undo', auth, async (req,res)=>{
  try{
    const { detailId, result } = req.body; // result normal|defect|hold
    if(!detailId || !['normal','defect','hold'].includes(result)){
      return res.status(400).json({ success:false, message:'잘못된 파라미터'});
    }
    const detail = await InspectionDetail.findByPk(detailId, { include:[{ model: Inspection, as:'Inspection'}]});
    if(!detail) return res.status(404).json({ success:false, message:'detail not found' });

    // 본인 스캔 기록 검색 (가장 최근)
    const scan = await WorkerScan.findOne({
      where:{ detailId, userId:req.user.id, result },
      order:[['createdAt','DESC']]
    });
    if(!scan) return res.status(400).json({ success:false, message:'되돌릴 스캔이 없습니다.'});

    // decrement counts (방어: 음수 방지)
    const field = result==='normal'?'handledNormal': result==='defect'?'handledDefect':'handledHold';
    if(detail[field]===0){
      return res.status(400).json({ success:false, message:'더 이상 취소할 수 없습니다.'});
    }
    await detail.decrement(field,{ by:1 });

    await scan.destroy();

    const remaining = detail.totalQuantity - detail.handledNormal - detail.handledDefect - detail.handledHold + (field==='handledHold'?1:0); // but easier recalc after reload
    await detail.reload();
    const newRemaining = detail.totalQuantity - detail.handledNormal - detail.handledDefect - detail.handledHold;

    // 전표 상태 복귀
    const insp = detail.Inspection;
    if(insp && insp.workStatus==='completed' && newRemaining>0){
      await insp.update({ workStatus:'in_progress' });
    }
    res.json({ success:true, remaining:newRemaining, detail });
  }catch(err){
    console.error('scan undo error', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// ----- BARCODE LOOKUP ROUTE (consolidated) -----
// replace entire existing router.get('/barcode/:code') implementation
router.get('/barcode/:code', auth, async (req, res) => {
  try {
    const code = stripZero(req.params.code.trim());

    // 1) 해당 바코드의 상품 변형 조회
    const variant = await ProductVariant.findOne({ where: { barcode: code } });
    if (!variant) {
      return res.status(404).json({ message: '해당 바코드에 대한 상품이 등록되어 있지 않습니다.' });
    }

    // 2) 잔량이 남아있는 확정·미완료 전표 상세 조회
    let detail = await InspectionDetail.findOne({
      where: {
        productVariantId: variant.id,
        [Op.and]: Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0')
      },
      include: [
        {
          model: Inspection,
          as: 'Inspection',
          where: { status: { [Op.in]: ['approved', 'confirmed'] }, workStatus: { [Op.ne]: 'completed' } }
        },
        { model: ProductVariant, as: 'ProductVariant' }
      ],
      order: [['createdAt', 'ASC']]
    });

    // 남은 수량이 없는 경우 detail 을 반환하지 않는다 (완료 전표 건너뜀)

    if (!detail || !detail.Inspection || ['completed', 'deleted'].includes(detail.Inspection.workStatus)) {
      return res.status(404).json({ success:false, code:'NOT_FOUND', message:'해당 전표를 찾을 수 없거나 완료되었습니다.' });
    }

    const inspection = await Inspection.findByPk(detail.inspectionId, {
      include: [
        {
          model: InspectionDetail,
          as: 'InspectionDetails',
          include: [{ model: ProductVariant, as: 'ProductVariant' }]
        }
      ],
      order: [[Sequelize.col('InspectionDetails.createdAt'), 'ASC']]
    });

    const details = inspection.InspectionDetails.map(d => {
      const remaining = d.totalQuantity - d.handledNormal - d.handledDefect - d.handledHold;
      return { ...d.toJSON(), remaining, ProductVariant: d.ProductVariant };
    });

    return res.json({ inspection, details });
  } catch (err) {
    console.error('barcode lookup error', err);
    return res.status(500).json({ message: err.message });
  }
});

/// ---------------- 특정 전표 상세(스캔용) ----------------
router.get('/inspection/:id/details', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const inspection = await Inspection.findByPk(id, {
      include: [{
        model: InspectionDetail,
        as: 'InspectionDetails',
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

// ------- 최근 활동 / 오류 보고 (간이 구현) -------
// 최근 활동 (향후 ActivityLog 테이블 구현 전까지 빈 배열 반환)
router.get('/recent-activity', auth, async (req, res) => {
  try {
    res.json([]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, async (req, res) => {
  try {
    const where = {};
    if (!['admin','inspector'].includes(req.user.role)) {
      // worker/operator 등 자신 기록만
      where.userId = req.user.id;
    } else if (req.query.userId) {
      // 관리자가 특정 작업자 기록만 조회하고 싶을 때 ?userId=
      where.userId = req.query.userId;
    }

    const scans = await WorkerScan.findAll({
      where,
      include: [
        {
          model: InspectionDetail,
          as: 'detail',
          include: [{ model: ProductVariant, as: 'ProductVariant' }]
        },
        { model: User, as: 'worker', attributes: ['id', 'username'] },
        { model: Inspection, as: 'Inspection', required: false, attributes: ['inspectionName', 'company'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 그룹화: 전표 단위 요약 (WorkerScan 기준으로 worker 및 날짜 파악)
    const summaryMap = new Map();
    for (const s of scans) {
      if (!s.Inspection) continue; // skip orphan scans
      const inspId = s.inspectionId;
      if (!summaryMap.has(inspId)) {
        summaryMap.set(inspId, {
          id: inspId,
          inspectionName: s.Inspection?.inspectionName || '',
          company: s.Inspection?.company || '',
          worker: s.worker,
          createdAt: s.createdAt,
          updatedAt: s.createdAt,
          totalNormal: 0,
          totalDefect: 0,
          totalHold: 0,
          workStatus: 'completed'
        });
      }
      const rec = summaryMap.get(inspId);
      // 가장 최근 스캔 시점으로 updatedAt 유지
      if (s.createdAt > rec.updatedAt) rec.updatedAt = s.createdAt;
    }

    // ----- 핵심 변경: InspectionDetail 에서 집계하여 정확한 최종 수량 반영 -----
    const inspIds = Array.from(summaryMap.keys());
    if (inspIds.length) {
      const aggregates = await InspectionDetail.findAll({
        attributes: [
          'inspectionId',
          [Sequelize.fn('SUM', Sequelize.col('handledNormal')), 'totalNormal'],
          [Sequelize.fn('SUM', Sequelize.col('handledDefect')), 'totalDefect'],
          [Sequelize.fn('SUM', Sequelize.col('handledHold')), 'totalHold']
        ],
        where: { inspectionId: { [Op.in]: inspIds } },
        group: ['inspectionId'],
        raw: true
      });
      for (const a of aggregates) {
        const rec = summaryMap.get(a.inspectionId);
        if (rec) {
          rec.totalNormal = parseInt(a.totalNormal || 0, 10);
          rec.totalDefect = parseInt(a.totalDefect || 0, 10);
          rec.totalHold = parseInt(a.totalHold || 0, 10);
        }
      }

      // updatedAt 은 Inspection.updatedAt 사용 (최근 수정 시각)
      const inspRows = await Inspection.findAll({
        attributes: ['id', 'updatedAt'],
        where: { id: { [Op.in]: inspIds } },
        raw: true
      });
      for (const i of inspRows) {
        const rec = summaryMap.get(i.id);
        if (rec) rec.updatedAt = i.updatedAt;
      }
    }

    return res.json(Array.from(summaryMap.values()));
  } catch (err) {
    console.error('history list error', err);
    return res.status(500).json({ message: err.message });
  }
});

// ----- 신규: 특정 완료 전표 상세 조회 (작업 완료 내역 수정용) -----
router.get('/history/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    // 완료 여부와 상태 무관하게 조회 (history 화면에서 이미 필터)
    const inspection = await Inspection.findByPk(id, {
      include: [
        {
          model: InspectionDetail,
          as: 'InspectionDetails',
          include: [{ model: ProductVariant, as: 'ProductVariant' }],
          order: [['createdAt', 'ASC']]
        },
        { model: User, as: 'inspector', attributes: ['id', 'username'] }
      ]
    });
    if (!inspection) return res.status(404).json({ message: 'inspection not found' });

    // 권한 체크: admin 또는 inspector 또는 해당 작업자의 기록이 있을 때 허용
    if (!['admin','inspector'].includes(req.user.role)) {
      const scanned = await WorkerScan.findOne({ where: { inspectionId: id, userId: req.user.id } });
      if (!scanned) return res.status(403).json({ message: '권한 없음' });
    }

    // 작업자 정보(최초 스캔자) 첨부 – history 화면 호환용
    const firstScan = await WorkerScan.findOne({
      where: { inspectionId: id },
      include: [{ model: User, as: 'worker', attributes: ['id', 'username'] }],
      order: [['createdAt', 'ASC']]
    });
    const json = inspection.toJSON();
    json.worker = firstScan?.worker || null;

    // 작업자별 기여 집계
    const scans = await WorkerScan.findAll({
      where:{ inspectionId: id },
      attributes:['userId','result', [Sequelize.fn('COUNT',Sequelize.col('WorkerScan.id')),'cnt']],
      include:[{ model: User, as:'worker', attributes:['id','username'] }],
      group:['userId','result','worker.id','worker.username'],
      raw:true
    });
    const contribMap = {};
    for(const s of scans){
      if(!contribMap[s.userId]) contribMap[s.userId]={ userId:s.userId, username:s['worker.username'], normal:0, defect:0, hold:0 };
      if(s.result==='normal') contribMap[s.userId].normal = parseInt(s.cnt,10);
      else if(s.result==='defect') contribMap[s.userId].defect = parseInt(s.cnt,10);
      else contribMap[s.userId].hold = parseInt(s.cnt,10);
    }
    json.contributions = Object.values(contribMap);

    return res.json(json);
  } catch (err) {
    console.error('history detail fetch error', err);
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/history/:id', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.status(403).json({message:'삭제 권한이 없습니다.'});
    const { id } = req.params; // id = WorkerScan record id
    const scan = await WorkerScan.findByPk(id);
    if(!scan) return res.status(404).json({ message:'기록을 찾을 수 없습니다.'});
    await scan.destroy();
    res.json({ success:true });
  }catch(err){
    console.error('history delete error', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/history/details/:detailId', auth, async (req,res)=>{
  try{
    const { detailId } = req.params;
    const { handledNormal, handledDefect, handledHold, qualityGrade } = req.body;

    const detail = await InspectionDetail.findByPk(detailId, { include:[{model:Inspection, as:'Inspection'}]});
    if(!detail) return res.status(404).json({ message:'detail not found'});

    // 권한: admin or 해당 작업자
    if(req.user.role!=='admin'){
      const has = await WorkerScan.findOne({ where:{ detailId: detail.id, userId: req.user.id } });
      if(!has) return res.status(403).json({ message:'권한 없음'});
    }

    await detail.update({ handledNormal, handledDefect, handledHold, qualityGrade });

    const remaining = detail.totalQuantity - handledNormal - handledDefect - handledHold;
    // workStatus 복귀
    const insp = detail.Inspection;
    if(remaining>0 && insp && insp.workStatus==='completed'){
      await insp.update({ workStatus:'in_progress' });
    }
    // 갱신 시간 업데이트 (내역 화면 최신순 정렬을 위해)
    if (insp) {
      await insp.update({ updatedAt: new Date() });
    }
    res.json({ success:true, remaining });
  }catch(err){
    console.error('history detail update error',err);
    res.status(500).json({ message:err.message });
  }
});

// ================= DASHBOARD EXTRA ROUTES =================
// 진행률 목록 – 확정(or 완료중) 전표의 처리건수를 퍼센트로 제공
router.get('/progress', auth, async (req,res)=>{
  try{
    // 확정된 전표 중 작업 미완료건
    const inspections = await Inspection.findAll({
      where:{ status:{ [Op.in]:['approved','completed'] }, workStatus:{ [Op.in]:['pending','in_progress','completed'] } },
      attributes:['id','inspectionName','company','workStatus','createdAt','updatedAt']
    });
    if(!inspections.length){ return res.json([]); }
    const inspIds = inspections.map(i=>i.id);

    // 수량 집계
    const aggregates = await InspectionDetail.findAll({
      attributes:[
        'inspectionId',
        [Sequelize.fn('SUM', Sequelize.col('totalQuantity')), 'totalQuantity'],
        [Sequelize.literal('SUM(handledNormal + handledDefect + handledHold)'), 'handledCount']
      ],
      where:{ inspectionId:{ [Op.in]: inspIds } },
      group:['inspectionId'],
      raw:true
    });

    const aggMap = {}; aggregates.forEach(a=>{ aggMap[a.inspectionId]=a; });

    const list = inspections.map(ins=>{
      const a = aggMap[ins.id] || { totalQuantity:0, handledCount:0 };
      const total = parseInt(a.totalQuantity||0,10);
      const handled = parseInt(a.handledCount||0,10);
      const percent = total? Math.floor((handled/total)*100) : 0;
      return {
        id: ins.id,
        inspectionName: ins.inspectionName,
        company: ins.company,
        handledCount: handled,
        totalQuantity: total,
        percent,
        workStatus: ins.workStatus,
        updatedAt: ins.updatedAt
      };
    });
    // 미완료(퍼센트<100) 먼저, 완료(100) 뒤로 정렬, 그 안에서 오름차순
    list.sort((a,b)=>{
      if(a.percent===100 && b.percent!==100) return 1;
      if(a.percent!==100 && b.percent===100) return -1;
      return a.percent - b.percent;
    });
    res.json(list);
  }catch(err){
    console.error('worker progress error', err);
    res.status(500).json({ message: err.message });
  }
});

// 미확정 전표 – status pending/rejected
router.get('/unconfirmed', auth, async (req,res)=>{
  try{
    const list = await Inspection.findAll({
      where:{ status:{ [Op.in]:['pending','rejected'] } },
      attributes:['id','inspectionName','company','status']
    });
    res.json(list);
  }catch(err){
    console.error('worker unconfirmed error', err);
    res.status(500).json({ message: err.message });
  }
});

// -------- 개인 작업 통계 (/worker/stats/summary) --------
router.get('/stats/summary', auth, async(req,res)=>{
  try{
    const { start, end } = req.query;
    const startDate = start? new Date(start) : new Date('1970-01-01');
    const endDate = end? new Date(end+'T23:59:59') : new Date();
    const userId = req.user.id;
    const scans = await WorkerScan.findAll({
      where:{ userId, createdAt:{ [Op.between]:[startDate,endDate] }},
      attributes:[
        [Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'],
        'result',
        [Sequelize.fn('COUNT', Sequelize.col('WorkerScan.id')), 'cnt']
      ],
      group:['date','result'],
      raw:true
    });

    const dailyMap = {};
    scans.forEach(s=>{
      const d = s.date;
      if(!dailyMap[d]) dailyMap[d]={ date:d, normal:0, defect:0, hold:0, slips:0 };
      if(s.result==='normal') dailyMap[d].normal += parseInt(s.cnt,10);
      else if(s.result==='defect') dailyMap[d].defect += parseInt(s.cnt,10);
      else dailyMap[d].hold += parseInt(s.cnt,10);
    });
    // distinct slips per day
    const slipRows = await WorkerScan.findAll({
      where:{ userId, createdAt:{ [Op.between]:[startDate,endDate] }},
      attributes:[[Sequelize.fn('DATE', Sequelize.col('createdAt')),'date'],'inspectionId'],
      group:['date','inspectionId'],
      raw:true
    });
    slipRows.forEach(r=>{ if(dailyMap[r.date]) dailyMap[r.date].slips +=1; });

    const daily = Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date));
    const totalNormal = daily.reduce((sum,r)=>sum+r.normal,0);
    const totalDefect = daily.reduce((sum,r)=>sum+r.defect,0);
    const totalHold = daily.reduce((sum,r)=>sum+r.hold,0);
    const totalSlips = daily.reduce((sum,r)=>sum+r.slips,0);

    res.json({ totalNormal, totalDefect, totalHold, totalSlips, daily });
  }catch(err){ console.error('stats summary error', err); res.status(500).json({ message:err.message }); }
});

// -------- 전체 작업자 통계 (/worker/stats/summary/all) --------
router.get('/stats/summary/all', auth, async(req,res)=>{
  try{
    if(!['admin','inspector'].includes(req.user.role)) return res.status(403).json({ message:'권한 없음'});
    const { start, end } = req.query;
    const startDate = start? new Date(start) : new Date('1970-01-01');
    const endDate = end? new Date(end+'T23:59:59') : new Date();

    // aggregate counts per worker/result
    const agg = await WorkerScan.findAll({
      where:{ createdAt:{ [Op.between]:[startDate,endDate] }},
      attributes:['userId','result', [Sequelize.fn('COUNT',Sequelize.col('WorkerScan.id')),'cnt']],
      include:[{ model: User, as:'worker', attributes:['username'] }],
      group:['userId','result','worker.id','worker.username'],
      raw:true
    });
    const map = {};
    agg.forEach(a=>{
      if(!map[a.userId]) map[a.userId]={ workerId:a.userId, workerName:a['worker.username'], totalNormal:0, totalDefect:0, totalHold:0, slips:[] };
      if(a.result==='normal') map[a.userId].totalNormal += parseInt(a.cnt,10);
      else if(a.result==='defect') map[a.userId].totalDefect += parseInt(a.cnt,10);
      else map[a.userId].totalHold += parseInt(a.cnt,10);
    });
    // slips details per worker
    const slipRows = await WorkerScan.findAll({
      where:{ createdAt:{ [Op.between]:[startDate,endDate] }},
      attributes:['userId','inspectionId', [Sequelize.fn('MIN',Sequelize.col('createdAt')),'firstScan'], [Sequelize.fn('MAX',Sequelize.col('createdAt')),'lastScan']],
      group:['userId','inspectionId'],
      raw:true
    });
    // need inspectionName
    const inspIds = [...new Set(slipRows.map(r=>r.inspectionId))];
    const inspRows = await Inspection.findAll({ where:{ id:{ [Op.in]: inspIds } }, attributes:['id','inspectionName'], raw:true });
    const inspMap = {}; inspRows.forEach(i=>{ inspMap[i.id]=i.inspectionName; });

    slipRows.forEach(r=>{
      const w = map[r.userId];
      if(!w) return;
      w.slips.push({ inspectionId:r.inspectionId, inspectionName: inspMap[r.inspectionId]||'', normal:0, defect:0, hold:0, firstScan:r.firstScan, lastScan:r.lastScan });
    });
    // counts per slip result
    const slipCnts = await WorkerScan.findAll({
      where:{ createdAt:{ [Op.between]:[startDate,endDate] }},
      attributes:['userId','inspectionId','result',[Sequelize.fn('COUNT',Sequelize.col('WorkerScan.id')),'cnt']],
      group:['userId','inspectionId','result'],
      raw:true
    });
    const slipKeyMap = {}; // workerId-inspectionId -> slip object
    Object.values(map).forEach(w=>{ w.slips.forEach(s=>{ slipKeyMap[`${w.workerId}-${s.inspectionId}`]=s; }); });
    slipCnts.forEach(c=>{
      const key = `${c.userId}-${c.inspectionId}`;
      const s = slipKeyMap[key]; if(!s) return;
      if(c.result==='normal') s.normal=parseInt(c.cnt,10);
      else if(c.result==='defect') s.defect=parseInt(c.cnt,10);
      else s.hold=parseInt(c.cnt,10);
    });

    const list = Object.values(map);
    list.forEach(w=>{ w.rank=0; });
    list.sort((a,b)=> (b.totalNormal+b.totalDefect+b.totalHold)-(a.totalNormal+a.totalDefect+a.totalHold));
    list.forEach((w,idx)=>{ w.rank=idx+1; });

    res.json(list);
  }catch(err){ console.error('stats summary all error', err); res.status(500).json({ message:err.message }); }
});

module.exports = router; 