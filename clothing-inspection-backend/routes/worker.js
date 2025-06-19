const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Inspection = require('../models/Inspection');
const ActivityLog = require('../models/ActivityLog');

// 작업자 통계 조회
router.get('/stats', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalInspections,
      completedInspections,
      inProgressInspections,
      errorInspections,
      todayScans,
      todayErrors
    ] = await Promise.all([
      // 전체 전표 수
      Inspection.countDocuments({ assignedWorker: req.user.id }),
      // 완료된 전표 수
      Inspection.countDocuments({
        assignedWorker: req.user.id,
        status: 'completed'
      }),
      // 진행중인 전표 수
      Inspection.countDocuments({
        assignedWorker: req.user.id,
        status: 'in_progress'
      }),
      // 오류 전표 수
      Inspection.countDocuments({
        assignedWorker: req.user.id,
        status: 'error'
      }),
      // 오늘의 스캔 수
      ActivityLog.countDocuments({
        worker: req.user.id,
        type: 'scan',
        createdAt: { $gte: today }
      }),
      // 오늘의 오류 수
      ActivityLog.countDocuments({
        worker: req.user.id,
        type: 'error',
        createdAt: { $gte: today }
      })
    ]);

    res.json({
      totalInspections,
      completedInspections,
      inProgressInspections,
      errorInspections,
      todayScans,
      todayErrors
    });
  } catch (error) {
    console.error('Worker stats error:', error);
    res.status(500).json({ message: '통계 조회에 실패했습니다.' });
  }
});

// 최근 활동 조회
router.get('/recent-activity', auth, async (req, res) => {
  try {
    const activities = await ActivityLog.find({ worker: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('inspection', 'inspectionNumber');

    res.json(activities);
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ message: '활동 조회에 실패했습니다.' });
  }
});

// 오류 보고 조회
router.get('/error-reports', auth, async (req, res) => {
  try {
    const errorReports = await Inspection.find({
      assignedWorker: req.user.id,
      status: 'error'
    })
    .sort({ updatedAt: -1 })
    .select('inspectionNumber errorNote updatedAt');

    res.json(errorReports);
  } catch (error) {
    console.error('Error reports error:', error);
    res.status(500).json({ message: '오류 보고 조회에 실패했습니다.' });
  }
});

module.exports = router; 