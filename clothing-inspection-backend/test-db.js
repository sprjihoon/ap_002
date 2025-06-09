const sequelize = require('./config/database');

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('데이터베이스 연결 성공!');
    
    // 테이블 목록 확인
    const tables = await sequelize.query('SHOW TABLES');
    console.log('현재 테이블 목록:', tables[0]);
    
    // users 테이블의 모든 컬럼 확인
    const columns = await sequelize.query('DESCRIBE users');
    console.log('\nusers 테이블 컬럼 구조:', columns[0]);
    
    // users 테이블의 모든 데이터 확인
    const users = await sequelize.query('SELECT * FROM users');
    console.log('\n현재 사용자 목록:', users[0]);
    
  } catch (error) {
    console.error('데이터베이스 연결 실패:', error);
  } finally {
    process.exit();
  }
}

testConnection(); 