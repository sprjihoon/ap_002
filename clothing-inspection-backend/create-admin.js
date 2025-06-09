const bcrypt = require('bcrypt');
const { User } = require('./models');

async function createAdminUser() {
  try {
    // 기존 admin 계정 삭제
    await User.destroy({
      where: { username: 'admin' }
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('관리자 계정이 생성되었습니다.');
    console.log('아이디: admin');
    console.log('비밀번호: admin123');
  } catch (error) {
    console.error('관리자 계정 생성 실패:', error);
  } finally {
    process.exit();
  }
}

createAdminUser(); 