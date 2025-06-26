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

// ===== BelongsTo 관계 (FK 차단, constraints:false) =====
models.InspectionComment.belongsTo(models.Inspection, {
  foreignKey: 'inspectionId',
  as: 'inspection',
  constraints: false
});

models.InspectionComment.belongsTo(models.InspectionComment, {
  foreignKey: 'parentCommentId',
  as: 'parent',
  constraints: false
});

models.InspectionComment.belongsTo(models.User, {
  foreignKey: 'userId',
  as: 'user',
  constraints: false
});

// ===== 기타 관계 =====

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

// ===== associate 실행 (모든 모델 정의 후) =====
Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});
