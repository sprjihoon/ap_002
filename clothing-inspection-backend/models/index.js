const User = require('./user');
const { Product, ProductVariant } = require('./product');
const Clothes = require('./clothes');
const Inspection = require('./inspection');
const InspectionReceiptPhoto = require('./inspectionReceiptPhoto');
const InspectionComment = require('./inspectionComment');
const InspectionRead = require('./inspectionRead');
const LabelTemplate = require('./labelTemplate');
const ActivityLog = require('./ActivityLog');
const Setting = require('./Setting');
const InspectionDetail = require('./inspectionDetail');
const sequelize = require('../config/database');

module.exports = {
  User,
  Product,
  ProductVariant,
  Clothes,
  Inspection,
  InspectionReceiptPhoto,
  InspectionComment,
  InspectionRead,
  LabelTemplate,
  ActivityLog,
  Setting,
  InspectionDetail
}; 

// 자동 alter 동기화는 운영 중 인덱스가 과다 생성되는 문제를 유발할 수 있어 비활성화
// 초기 마이그레이션 후에는 별도 migration 파일에서 스키마를 관리하세요.
// (async () => {
//   await sequelize.sync({ alter: true });
// })();

// ===== Associations =====
Inspection.hasMany(InspectionComment, { foreignKey:'inspectionId', as:'comments', onDelete:'CASCADE' });
InspectionComment.belongsTo(Inspection, { foreignKey:'inspectionId' });

User.hasMany(InspectionComment, { foreignKey:'userId' });
InspectionComment.belongsTo(User, { foreignKey:'userId' });

// self association for nested replies
InspectionComment.hasMany(InspectionComment, { as:'replies', foreignKey:'parentCommentId', onDelete:'CASCADE' });
InspectionComment.belongsTo(InspectionComment, { as:'parent', foreignKey:'parentCommentId' });

Inspection.belongsToMany(User, { through: InspectionRead, foreignKey:'inspectionId', otherKey:'userId', as:'readers' });
User.belongsToMany(Inspection, { through: InspectionRead, foreignKey:'userId', otherKey:'inspectionId' });

// Inspector 관계
User.hasMany(Inspection, { foreignKey:'inspector_id', as:'inspections' });
Inspection.belongsTo(User, { foreignKey:'inspector_id', as:'inspector' }); 

// ===== ActivityLog 관계 =====
ActivityLog.belongsTo(Inspection, { foreignKey:'inspectionId' });
Inspection.hasMany(ActivityLog, { foreignKey:'inspectionId' });

ActivityLog.belongsTo(User, { foreignKey:'userId' });
User.hasMany(ActivityLog, { foreignKey:'userId' }); 