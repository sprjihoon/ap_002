// models/index.js – consolidated relations, no associate loop, FK‑free

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// ────────────────────────
// 1. Dynamic model loading
// ────────────────────────
const models = {};

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== path.basename(__filename) &&
      file.slice(-3) === '.js'
  )
  .forEach((file) => {
    const imported = require(path.join(__dirname, file));
    let model;

    if (
      typeof imported === 'function' &&
      !(imported.prototype instanceof Sequelize.Model)
    ) {
      model = imported(sequelize, Sequelize.DataTypes);
    } else {
      model = imported;
    }

    models[model.name] = model;
  });

// ────────────────────────
// 2. Relations (constraints:false)
// ────────────────────────
const {
  User,
  Inspection,
  InspectionComment,
  InspectionRead,
  ActivityLog
} = models;

// Inspection ↔ InspectionComment (1:N)
Inspection.hasMany(InspectionComment, {
  foreignKey: 'inspectionId',
  as: 'comments',
  onDelete: 'CASCADE',
  constraints: false
});
InspectionComment.belongsTo(Inspection, {
  foreignKey: 'inspectionId',
  as: 'inspection',
  constraints: false
});

// User ↔ InspectionComment (1:N)
User.hasMany(InspectionComment, {
  foreignKey: 'userId',
  constraints: false
});
InspectionComment.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
  constraints: false
});

// self‑reply
InspectionComment.belongsTo(InspectionComment, {
  foreignKey: 'parentCommentId',
  as: 'parent',
  constraints: false
});

// Inspection ↔ User (읽음표시)
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

// ActivityLog 예시
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

// ────────────────────────
// 3. Export
// ────────────────────────
models.sequelize = sequelize;
models.Sequelize = Sequelize;
module.exports = models;
