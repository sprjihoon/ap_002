const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Clothes = require('../models/clothes');

// Get all clothes
router.get('/', auth, async (req, res) => {
  try {
    const clothes = await Clothes.findAll();
    res.json(clothes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new clothes
router.post('/', auth, async (req, res) => {
  try {
    const clothes = await Clothes.create(req.body);
    res.status(201).json(clothes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update clothes
router.put('/:id', auth, async (req, res) => {
  try {
    const clothes = await Clothes.findByPk(req.params.id);
    if (!clothes) {
      return res.status(404).json({ message: 'Clothes not found' });
    }
    await clothes.update(req.body);
    res.json(clothes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete clothes
router.delete('/:id', auth, async (req, res) => {
  try {
    const clothes = await Clothes.findByPk(req.params.id);
    if (!clothes) {
      return res.status(404).json({ message: 'Clothes not found' });
    }
    await clothes.destroy();
    res.json({ message: 'Clothes deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 