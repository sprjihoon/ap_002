const express = require('express');
const router = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { auth } = require('../middleware/auth');
const { getSetting, setSetting } = require('../utils/settings');

// 저장 경로 /uploads/settings
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'settings');
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
  loginBg: 'loginBgUrl'
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

// GET /api/settings/ui   (public)
router.get('/ui', async (_req, res) => {
  try {
    const [sound, bg] = await Promise.all([
      getSetting('completeSoundUrl'),
      getSetting('loginBgUrl')
    ]);
    res.json({ completeSoundUrl: sound, loginBgUrl: bg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 