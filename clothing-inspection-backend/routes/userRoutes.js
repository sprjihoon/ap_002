const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { auth, JWT_SECRET } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const User = require('../models/user');
const { WorkerScan } = require('../models');
const { Op, Sequelize } = require('sequelize');
const Inspection = require('../models/inspection');
const InspectionDetail = require('../models/inspectionDetail');
const { ActivityLog } = require('../models');
const CompleteSound = require('../models/CompleteSound');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 관리자 권한 확인 미들웨어
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/settings');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user
router.post('/register', auth, isAdmin, async (req, res) => {
  try {
    const { username, email, password, company, role } = req.body;

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      company,
      role
    });

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: '사용자 등록이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        company: user.company,
        role: user.role
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: '이미 존재하는 사용자 이름 또는 이메일입니다.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Login with rate limiting
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 정보 조회 (인증 필요)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'role']
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 비밀번호 변경
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '현재 비밀번호가 일치하지 않습니다.' });
    }

    // 새 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 정보 수정
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    const { username, email, company, role, password } = req.body;
    
    // 중복 체크
    if (username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ message: '이미 사용 중인 사용자명입니다.' });
      }
    }

    if (email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
      }
    }

    const updateData = { username, email, company, role };
    // 관리자만 다른 사용자의 role / password 변경 허용
    if (password && req.user.role === 'admin') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        company: user.company,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 모든 사용자 조회 (관리자용)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'company', 'role', 'createdAt']
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 역할 변경 (관리자용)
router.put('/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    await user.update({ role });
    res.json({ message: '사용자 역할이 변경되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 삭제 (관리자용)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 자기 자신은 삭제할 수 없음
    if (user.id === req.user.id) {
      return res.status(400).json({ message: '자기 자신의 계정은 삭제할 수 없습니다.' });
    }

    await user.destroy();
    res.json({ message: '사용자가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 목록
router.get('/history', auth, async (req,res)=>{
  const where = {};
  if (req.user.role !== 'admin') where.userId = req.user.id;
  if (req.query.userId)          where.userId = req.query.userId;

  const rows = await WorkerScan.findAll({
    where,
    attributes:[
      'inspectionId','userId',
      [Sequelize.literal(`
        SUM(CASE WHEN result IN ('normal','defect','hold') THEN 1 END)
      `),'myCount'],
      // othersCount = totalByDetail - myCount  (아래 after 처리)
      [Sequelize.fn('MIN',Sequelize.col('WorkerScan.createdAt')),'startedAt'],
      /* 전표 전체의 마지막 스캔 시각을 finishedAt 으로 */
      [Sequelize.literal(`(
        SELECT MAX(createdAt)
        FROM   WorkerScans AS ws2
        WHERE  ws2.inspectionId = WorkerScan.inspectionId
          AND  ws2.result IN ('normal','defect','hold')
      )`), 'finishedAt']
    ],
    include:[
      { model:Inspection,   as:'Inspection', required:false },
      { model:User,         as:'worker',     attributes:['id','username'] },
      { model:InspectionDetail, as:'detail', attributes:['totalQuantity'] } // 합계 계산용
    ],
    group:['inspectionId','userId'],
    order:[['finishedAt','DESC']]
  });

  const list = rows.map(r=>{
    const totalDetail = r.detail.reduce((t,d)=>t+d.totalQuantity,0);
    const my      = parseInt(r.get('myCount'),10);
    if (!r.Inspection) return;
    return {
      inspectionId: r.inspectionId,
      inspectionName: r.Inspection ? r.Inspection.inspectionName : '(삭제됨)',
      company: r.Inspection.company,
      userId: r.userId,
      worker: r.worker,
      myCount: my,
      othersCount: totalDetail - my,
      startedAt: r.get('startedAt'),
      finishedAt: r.get('finishedAt')
    };
  });
  res.json(list);
});

router.get('/my-inspections', auth, async (req,res)=>{
  const rows = await WorkerScan.findAll({
    where:{ userId:req.user.id },
    attributes:[
      'inspectionId',
      [Sequelize.fn('COUNT',Sequelize.col('*')),'myCount']
    ],
    include:[
      { model:Inspection, as:'Inspection', attributes:['inspectionName','company'] },
      { model:WorkerScan, as:'others',                     // self-join로 타인 집계
        attributes:[[Sequelize.fn('COUNT',Sequelize.col('others.id')),'othersCount']],
        required:false,
        where:{ userId:{[Op.ne]:req.user.id} }
      }
    ],
    group:['inspectionId']
  });
  res.json(rows.map(r=>({
    inspectionId : r.inspectionId,
    inspectionName: r.Inspection.inspectionName,
    company      : r.Inspection.company,
    myCount      : r.get('myCount'),
    othersCount  : r.others?.[0]?.get('othersCount')||0
  })));
});

router.put('/history/details/:detailId', auth, async (req,res)=>{
  const detail = await InspectionDetail.findByPk(req.params.detailId,{ include:[{model:Inspection,as:'Inspection'}]});
  if(!detail) return res.status(404).json({message:'detail not found'});
  // 권한: 본인 또는 admin
  if(req.user.role!=='admin'){
    const scan = await WorkerScan.findOne({ where:{ detailId:detail.id, userId:req.user.id }});
    if(!scan) return res.status(403).json({message:'권한 없음'});
  }

  const { handledNormal, handledDefect, handledHold } = req.body;
  await detail.update({ handledNormal, handledDefect, handledHold });

  // ❶ 잔여 수량 재계산
  const remaining = detail.totalQuantity - handledNormal - handledDefect - handledHold;

  // ❷ 전표 상태 복구
  if(remaining > 0 && detail.Inspection.workStatus==='completed'){
    await detail.Inspection.update({ workStatus:'in_progress' });
  }

  res.json({success:true, remaining});
});

router.post('/upload', auth, isAdmin, async (req,res)=>{
  if (!req.file) {
    return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
  }

  const filePath = `/uploads/settings/${req.file.originalname}`;
  const fullPath = path.join(__dirname, '../../public', filePath);

  try {
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.rename(req.file.path, fullPath);

    res.json({ url: filePath });
  } catch (error) {
    await fs.promises.unlink(req.file.path); // 업로드 실패 시 파일 삭제
    res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.', error: error.message });
  }
});

router.delete('/upload/:type', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const key = req.params.type === 'sound' ? 'completeSoundUrl'
           : req.params.type === 'loginBg' ? 'loginBgUrl'
           : null;
  if (!key) return res.status(400).json({ message:'invalid type'});
  // setSetting(key, null); // 기존 설정 함수는 제거됨
  res.json({ success:true });
});

// /api/settings/ui 응답에 무작위 1개 포함
router.get('/ui', async (_req,res)=>{
  const sounds = await CompleteSound.findAll();
  const rand   = sounds.length ? sounds[Math.floor(Math.random()*sounds.length)].url : null;
  const [theme,logoUrl,notice,loginBgUrl] = await Promise.all([
    // getSetting('theme'), getSetting('logoUrl'), // 기존 설정 함수는 제거됨
    // getSetting('notice'), getSetting('loginBgUrl')
    Promise.resolve('light'), // 임시 값
    Promise.resolve('/uploads/logo.png'), // 임시 값
    Promise.resolve(''), // 임시 값
    Promise.resolve(null) // 임시 값
  ]);
  res.json({
    theme : theme  || 'light',
    logo  : logoUrl|| '/uploads/logo.png',
    notice: notice || '',
    loginBgUrl,
    completeSoundUrl: rand
  });
});

router.get('/companies', auth, async (_req,res)=>{
  const rows = await User.findAll({
    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('company')), 'company']]
  });
  const list = rows.map(r=>r.company).filter(Boolean);
  res.json(list);
});

router.get('/activity', auth, async (req,res)=>{
  if (req.user.role !== 'admin') return res.sendStatus(403);

  let { start, end, date, level } = req.query;

  // ① 단일 date 파라미터 → 동일한 start·end 로 변환
  if (date && !start && !end){
    start = date;
    end   = date;
  }

  // ② 아무것도 없으면 ‘오늘’ 자동 적용
  if (!start && !end){
    const today = new Date().toISOString().substring(0,10); // YYYY-MM-DD
    start = end = today;
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate   = new Date(`${end}T23:59:59`);

  const where = { createdAt:{ [Op.between]:[startDate,endDate] } };
  if (level) where.level = level;

  try {
    const logs = await ActivityLog.findAll({
      where,
      include:[
        { model:Inspection, attributes:['inspectionName'] },
        { model:User, attributes:['id','username'] }
      ],
      order:[['createdAt','DESC']]
    });

    res.json(logs.map(l=>({
      id:l.id,
      createdAt:l.createdAt,
      level:l.level,
      type:l.type,
      message:l.message,
      inspectionName:l.Inspection?.inspectionName||null,
      user:l.User?.username||null
    })));
  } catch(err){
    console.error('activity list error', err);
    res.status(500).json({ message: err.message });
  }
});

// 업로드 (복수 저장)
router.post('/sounds', auth, upload.single('file'), async (req,res)=>{
  if(req.user.role!=='admin') return res.sendStatus(403);
  const relUrl = `/uploads/settings/${req.file.filename}`;
  await CompleteSound.create({ url: relUrl });
  res.json({ success:true });
});

// 목록
router.get('/sounds', auth, async (_req,res)=>{
  if(_req.user.role!=='admin') return res.sendStatus(403);
  const list = await CompleteSound.findAll({ order:[['createdAt','DESC']] });
  res.json(list);
});

// 삭제
router.delete('/sounds/:id', auth, async (req,res)=>{
  if(req.user.role!=='admin') return res.sendStatus(403);
  const row = await CompleteSound.findByPk(req.params.id);
  if(!row) return res.sendStatus(404);
  await row.destroy();
  res.json({ success:true });
});

module.exports = router; 
