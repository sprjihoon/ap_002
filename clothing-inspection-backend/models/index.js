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

module.exports = models;

// ===== 관계 선언 (hasMany / belongsToMany 등) =====

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

// self-association 관계는 InspectionComment 내부 associate()에서만 관리

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

// associate 함수는 모든 모델 등록 후 한 번에 실행
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});
