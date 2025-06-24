// sync-db.js (기존 85줄 구조를 유지하며 안전하게 수정)
const sequelize = require('./config/database');
require('./models');
const User = require('./models/user');
const Clothes = require('./models/clothes');
const Inspection = require('./models/inspection');
const Product = require('./models/product');
const bcrypt = require('bcrypt');

async function syncDatabase() {
  try {
    console.log('🛠 DB 동기화 시작...');

    // DB 연결 테스트
    await sequelize.authenticate();
    console.log('✅ DB 연결 성공');

    // 데이터베이스 동기화 (주의: force: true는 개발용)
    await sequelize.sync({ force: true });
    console.log('✅ DB 동기화 완료');

    // 기본 관리자 계정 생성
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    });
    console.log('✅ 관리자 계정 생성 완료');

    // 운영자 계정 생성
    const operatorPassword = await bcrypt.hash('op123', 10);
    const operators = [
      { username: 'op1', email: 'op1@naver.com', company: '테스트업체1' },
      { username: 'op2', email: 'op2@naver.com', company: '테스트업체2' },
      { username: 'op3', email: 'op3@naver.com', company: '테스트업체3' },
      { username: 'op4', email: 'op4@naver.com', company: '테스트업체4' },
      { username: 'op5', email: 'op5@naver.com', company: '테스트업체5' },
      { username: 'op6', email: 'op6@naver.com', company: '테스트업체6' }
    ];

    for (const op of operators) {
      await User.create({
        username: op.username,
        email: op.email,
        password: operatorPassword,
        company: op.company,
        role: 'operator'
      });
    }

    console.log('✅ 운영자 계정 6개 생성 완료');
    console.log('🎉 DB 초기화 및 계정 생성 완료');
  } catch (error) {
    console.error('❌ DB 동기화 중 오류 발생:', error);
  }
}

syncDatabase().then(() => {
  console.log('✅ sync-db.js 완료 (앱 계속 실행 중)');
}).catch(err => {
  console.error('❌ sync-db.js 오류:', err);
});
