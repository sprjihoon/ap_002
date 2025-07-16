const express = require('express');
const router = express.Router();
const { Op, Sequelize } = require('sequelize');
const { auth } = require('../middleware/auth');
const WorkerScan = require('../models').WorkerScan;
const InspectionDetail = require('../models/inspectionDetail');
const Inspection = require('../models/inspection');

// GET /api/reports/work?granularity=day&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/work', auth, async (req, res) => {
  try {
    // Only admin / inspector / display can access
    if (!['admin', 'inspector', 'display'].includes(req.user.role)) {
      return res.status(403).json({ message: '권한 없음' });
    }

    const { granularity = 'day', start, end } = req.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end + 'T23:59:59') : new Date();

    // DATE_FORMAT pattern per granularity
    const fmt = granularity === 'week'
      ? '%Y-%u'
      : granularity === 'month'
      ? '%Y-%m'
      : granularity === 'quarter'
      ? '%Y-Q%q'
      : granularity === 'year'
      ? '%Y'
      : '%Y-%m-%d'; // default day

    const scans = await WorkerScan.findAll({
      attributes: [
        [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), fmt), 'grp'],
        [Sequelize.literal('COUNT(*)'), 'totalQty'],
        [Sequelize.literal("SUM(CASE WHEN result='defect' THEN 1 ELSE 0 END)"), 'defectQty']
      ],
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      group: ['grp'],
      order: [[Sequelize.literal('grp'), 'ASC']],
      raw: true
    });

    // today handled normal etc not required here.

    return res.json({ granularity, from: startDate.toISOString().slice(0,10), to: endDate.toISOString().slice(0,10), data: scans });
  } catch (err) {
    console.error('report work error', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 