const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Inspection = require('../models/inspection');
const Clothes = require('../models/clothes');
const User = require('../models/user');

// 모든 검수 내역 조회
router.get('/', auth, async (req, res) => {
  try {
    const inspections = await Inspection.findAll({
      include: [Clothes, User]
    });
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 새 검수 내역 등록
router.post('/', auth, async (req, res) => {
  try {
    const inspection = await Inspection.create({
      ...req.body,
      inspector_id: req.user.id
    });
    res.status(201).json(inspection);
  } catch (error) {
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
    await inspection.update(req.body);
    res.json(inspection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 