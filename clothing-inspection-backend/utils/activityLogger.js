const ActivityLog = require('../models/ActivityLog');

/**
 * 기록 도우미 – try/catch 로 감싸 로그 실패가 주 로직에 영향 주지 않도록 한다.
 * @param {object} req Express request (user 활용)
 * @param {object} param1 { inspectionId, type, message, level }
 */
exports.logActivity = async (req, { inspectionId = null, type, message, level = 'info' }) => {
  try {
    await ActivityLog.create({
      inspectionId,
      userId: req?.user?.id || null,
      type,
      message,
      level
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('ActivityLog write error', e);
  }
}; 