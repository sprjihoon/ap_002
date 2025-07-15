const express = require('express');
const router = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { auth } = require('../middleware/auth');
const { getSetting, setSetting } = require('../utils/settings');
const { CompleteSound } = require('../models');

// 저장 경로 (Persistent disk 지원)
const BASE = process.env.UPLOAD_BASE || path.join(__dirname, '..', '..', 'uploads');
const UPLOAD_DIR = path.join(BASE, 'settings');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '_' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

const TYPE_TO_KEY = {
  sound: 'completeSoundUrl',
  loginBg: 'loginBgUrl',
  startup: 'startupSoundUrl'
};

// POST /api/settings/upload  (admin only)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한 필요' });
    }
    const { type } = req.body;
    if (!type || !TYPE_TO_KEY[type]) {
      return res.status(400).json({ message: 'type must be sound or loginBg' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'file required' });
    }
    const relUrl = `/uploads/settings/${req.file.filename}`;
    await setSetting(TYPE_TO_KEY[type], relUrl);
    res.json({ url: relUrl });
  } catch (err) {
    console.error('settings upload error', err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/settings/upload/:type  (admin only)
router.delete('/upload/:type', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.sendStatus(403);
    const type=req.params.type;
    const key = type==='sound' ? 'completeSoundUrl'
              : type==='loginBg' ? 'loginBgUrl' : null;
    if(!key) return res.status(400).json({ message:'invalid type'});
    await setSetting(key,null);
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// POST /api/settings/sounds  (upload complete sound)
router.post('/sounds', auth, upload.single('file'), async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.sendStatus(403);
    if(!req.file) return res.status(400).json({ message:'file required' });
    const relUrl = `/uploads/settings/${req.file.filename}`;
    const max = await CompleteSound.max('order');
    const nextOrder = Number.isInteger(max) ? max + 1 : 0;
    await CompleteSound.create({ url: relUrl, order: nextOrder, originalName: req.file.originalname });
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// GET list
router.get('/sounds', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.sendStatus(403);
  const list = await CompleteSound.findAll({ order:[['order','ASC']] });
  res.json(list);
});

// PUT /api/settings/sounds/order   { order:[id1,id2,...] }
router.put('/sounds/order', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.sendStatus(403);
    const { order } = req.body;
    if(!Array.isArray(order)) return res.status(400).json({ message:'order array required' });
    // transaction update
    await CompleteSound.sequelize.transaction(async t=>{
      for(let i=0;i<order.length;i++){
        await CompleteSound.update({ order:i }, { where:{ id:order[i] }, transaction:t });
      }
    });
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// DELETE sound by id
router.delete('/sounds/:id', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.sendStatus(403);
    const row = await CompleteSound.findByPk(req.params.id);
    if(!row) return res.sendStatus(404);
    await row.destroy();
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// GET /api/settings/ui   (public)
router.get('/ui', async (_req,res)=>{
  try{
    const [theme,logoUrl,notice,loginBgUrl,soundPlayMode,startupSoundUrl] = await Promise.all([
      getSetting('theme'), getSetting('logoUrl'), getSetting('notice'), getSetting('loginBgUrl'), getSetting('soundPlayMode'), getSetting('startupSoundUrl')
    ]);
    // pick random sound
    const sounds = await CompleteSound.findAll({ order:[['order','ASC']] });
    const soundUrls = sounds.map(s=>s.url);
    const randomSound = soundUrls.length ? soundUrls[Math.floor(Math.random()*soundUrls.length)] : null;
    res.json({ theme: theme||'light', logo: logoUrl||'/uploads/logo.png', notice: notice||'', loginBgUrl, soundPlayMode: soundPlayMode||'random', completeSoundUrl: randomSound, sounds: soundUrls, startupSoundUrl });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// PUT /api/settings/sound-mode { mode: 'sequential'|'random' }
router.put('/sound-mode', auth, async (req,res)=>{
  try{
    if(req.user.role!=='admin') return res.sendStatus(403);
    const { mode }=req.body;
    if(!['sequential','random'].includes(mode)) return res.status(400).json({ message:'invalid mode'});
    await setSetting('soundPlayMode', mode);
    res.json({ success:true });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

module.exports = router; 
