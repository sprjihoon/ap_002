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

const models = {
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

if (InspectionComment.associate) {
  InspectionComment.associate(models);
}

module.exports = models;

// 자동 alter 동기화는 운영 중 인덱스가 과다 생성되는 문제를 유발할 수 있어 비활성화
// 초기 마이그레이션 후에는 별도 migration 파일에서 스키마를 관리하세요.
// (async () => {
//   await sequelize.sync({ alter: true });
// })();

// ===== Associations =====
Inspection.hasMany(models.InspectionComment, {
  foreignKey: 'inspectionId',
  as: 'comments',
  onDelete: 'CASCADE',
  constraints: false
});

User.hasMany(models.InspectionComment, {
  foreignKey: 'userId',
  constraints: false
});

// self association for nested replies
models.InspectionComment.hasMany(models.InspectionComment, {
  as: 'replies',
  foreignKey: 'parentCommentId',
  onDelete: 'CASCADE',
  constraints: false
});

Inspection.belongsToMany(User, {
  through: InspectionRead,
  foreignKey: 'inspectionId',
  otherKey: 'userId',
  as: 'readers',
  constraints: false
});
User.belongsToMany(Inspection, {
  through: InspectionRead,
  foreignKey: 'userId',
  otherKey: 'inspectionId',
  constraints: false
});

// Inspector 관계
User.hasMany(Inspection, {
  foreignKey: 'inspector_id',
  as: 'inspections',
  constraints: false
});
Inspection.belongsTo(User, {
  foreignKey: 'inspector_id',
  as: 'inspector',
  constraints: false
});

// ===== ActivityLog 관계 =====
ActivityLog.belongsTo(Inspection, {
  foreignKey: 'inspectionId',
  constraints: false
});
Inspection.hasMany(ActivityLog, {
  foreignKey: 'inspectionId',
  constraints: false
});

ActivityLog.belongsTo(User, {
  foreignKey: 'userId',
  constraints: false
});
User.hasMany(ActivityLog, {
  foreignKey: 'userId',
  constraints: false
});
