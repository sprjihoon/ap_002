const sequelize = require('./config/database');

async function addCompanyColumn() {
  try {
    // op1의 role을 operator로 수정
    await sequelize.query(`
      UPDATE users 
      SET role = 'operator' 
      WHERE username = 'op1'
    `);
    console.log('op1의 role이 operator로 수정되었습니다.');

    // 기존 운영자 계정에 업체명 업데이트
    await sequelize.query(`
      UPDATE users 
      SET company = '테스트업체1' 
      WHERE username = 'op1' AND role = 'operator'
    `);
    
    await sequelize.query(`
      UPDATE users 
      SET company = '테스트업체2' 
      WHERE username = 'op2' AND role = 'operator'
    `);

    await sequelize.query(`
      UPDATE users 
      SET company = '테스트업체3' 
      WHERE username = 'op3' AND role = 'operator'
    `);
    
    console.log('운영자 계정의 업체명이 업데이트되었습니다.');

    // 변경사항 확인
    const users = await sequelize.query('SELECT id, username, email, role, company FROM users');
    console.log('현재 사용자 목록:', users[0]);

  } catch (error) {
    console.error('업데이트 중 오류 발생:', error);
  } finally {
    process.exit();
  }
}

addCompanyColumn(); 