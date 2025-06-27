let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (err) {
  // In CI environments without dependencies, fall back to a no-op middleware
  rateLimit = () => (req, res, next) => next();
}

// 일반 API 요청 제한
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  message: { message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' }
});

// 로그인 요청 제한
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 5, // IP당 최대 로그인 시도 횟수
  message: { message: '너무 많은 로그인 시도가 발생했습니다. 1시간 후 다시 시도해주세요.' }
});

module.exports = {
  apiLimiter,
  loginLimiter
}; 
