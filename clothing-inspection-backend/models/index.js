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

// 모든 모델 객체 정리
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

// 관계 설정 (associate는 모델 정의 후에 실행되어야 함)
if (InspectionComment.associate) {
  InspectionComment.associate(models);
}

module.exports = models;

// ===== 관계 선언 (hasMany, belongsToMany 등) =====

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

// belongsTo(parent) 관계는 associate() 내부에서만 선언됨

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

// 자동 alter 동기화는 운영 시 비활성화
// (async () => {
//   await sequelize.sync({ alter: true });
// })();
