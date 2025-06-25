// sync-db.js
const sequelize = require('./config/database');
require('./models'); // 관계설정 models/index.js 에서 하셨으면 이거면 충분
const User = require('./models/user');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function syncDatabase() {
  try {
    console.log('🛠 DB 동기화 시작...');

    // DB 연결 테스트
    await sequelize.authenticate();
    console.log('✅ DB 연결 성공');

    // FK 생성을 원천 차단하고자 한다면, 
    // 모델 내부 모든 관계 선언에 constraints: false 붙어야 함

    // DB 동기화 (force: true는 개발/초기화용)
    console.log('👉 sequelize.sync({ force: true, logging }) 실행 준비');
    await sequelize.sync({
      force: true,
      logging: (sql) => /foreign key/i.test(sql) &&
        console.error('🚨 FK SQL', sql)
    });
    console.log('✅ DB 동기화 완료');

    // 기본 관리자 계정 생성
    const adminRaw = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPassword = await bcrypt.hash(adminRaw, 10);
    await User.create({
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    });
    console.log('✅ 관리자 계정 생성 완료');

    // 운영자 계정 정보
    const operatorRaw = process.env.OPERATOR_PASSWORD || 'op123';
    const operatorPassword = await bcrypt.hash(operatorRaw, 10);
    const operators = [
      { username: 'op1', email: 'op1@naver.com', company: '테스트업체1' },
      { username: 'op2', email: 'op2@naver.com', company: '테스트업체2' },
      { username: 'op3', email: 'op3@naver.com', company: '테스트업체3' },
      { username: 'op4', email: 'op4@naver.com', company: '테스트업체4' },
      { username: 'op5', email: 'op5@naver.com', company: '테스트업체5' },
      { username: 'op6', email: 'op6@naver.com', company: '테스트업체6' }
    ];

    await User.bulkCreate(
      operators.map(op => ({
        username: op.username,
        email: op.email,
        password: operatorPassword,
        company: op.company,
        role: 'operator'
      }))
    );
    operators.forEach(op => console.log(`✅ 운영자 계정 생성: ${op.username}`));

    console.log('🎉 DB 초기화 및 계정 생성 완료');
  } catch (error) {
    console.error('❌ DB 동기화 중 오류 발생:', error.message);
    // 앱 강제종료 방지 (Render 등 클라우드 환경 대응)
  } finally {
    await sequelize.close();
    console.log('✅ DB 연결 종료');
  }
}

// 바로 실행
syncDatabase().then(() => {
  console.log('✅ sync-db.js 완료');
}).catch(err => {
  console.error('❌ sync-db.js 오류:', err.message);
});
