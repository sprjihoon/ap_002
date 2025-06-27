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
    // 해당 바코드가 포함된 품목이 있는 미완료 전표를 조회한다.
    const targetDetail = await InspectionDetail.findOne({
      where:{
        [Op.and]: [
          Sequelize.literal('(totalQuantity - handledNormal - handledDefect - handledHold) > 0')
        ]
      },
      include:[
        { model: ProductVariant, as:'ProductVariant', where:{ barcode:req.params.code } },
        { model: Inspection, as:'Inspection', where:{ status:'approved', workStatus:{[Op.ne]:'completed'} } }
      ],
      order:[[Sequelize.col('InspectionDetail.createdAt'),'ASC']]
    });
    if (!targetDetail) return res.status(404).json({ message:'남은 수량이 있는 전표가 없습니다.'});

    const inspection = await Inspection.findByPk(targetDetail.inspectionId, {
      include:[{ model: InspectionDetail, as:'InspectionDetails', include:[{ model: ProductVariant, as:'ProductVariant' }] }],
      order:[[Sequelize.col('InspectionDetails.createdAt'),'ASC']]
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
