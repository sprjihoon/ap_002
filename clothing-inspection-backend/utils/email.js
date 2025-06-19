const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const User = require('../models/user');

// SMTP 설정은 환경변수로 관리
const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_SECURE = false,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

/**
 * 간단한 텍스트 이메일 발송
 * @param {string|string[]} to 수신자 이메일 (단일 또는 배열)
 * @param {string} subject 제목
 * @param {string} text 본문
 * @param {string} [from] 보내는 사람 주소(옵션)
 */
async function sendEmail({ to, subject, text, from }) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP 환경변수가 설정되어 있지 않아 이메일을 발송하지 않습니다.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE) === 'true', // true = 465, false = other
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  let defaultFrom = from || SMTP_FROM;
  if (!defaultFrom) {
    const admin = await User.findOne({ where:{ role:'admin', email:{ [Op.ne]: null } }, attributes:['email'] });
    if (admin && admin.email) defaultFrom = admin.email;
  }
  if (!defaultFrom) defaultFrom = SMTP_USER;

  await transporter.sendMail({
    from: defaultFrom,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    text
  });
}

module.exports = { sendEmail }; 