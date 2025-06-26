// models/index.js – robust dynamic loader, FK‑free, guards against undefined

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// 1. Dynamic model loading – skip invalid exports
const models = {};

fs.readdirSync(__dirname)
  .filter((file) => file.endsWith('.js') && file !== path.basename(__filename))
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

    if (!model || !model.name) {
      console.warn(`[models/index.js] ⚠️  Skip invalid model export in ${file}`);
      return;
    }

    // original key
    models[model.name] = model;

    // Only add PascalCase alias if model.name is a non‑empty string
    if (typeof model.name === 'string' && model.name.length > 0) {
      const pascal = model.name[0].toUpperCase() + model.name.slice(1);
      models[pascal] = model;
    } = model.name[0].toUpperCase() + model.name.slice(1);
    models[pascal] = model;
  });

// 2. Helper getter insensitive to case
const get = (key) =>
  models[key] || models[key?.toLowerCase?.()] || models[key?.toUpperCase?.()];

const User              = get('User');
const Inspection        = get('Inspection');
const InspectionComment = get('InspectionComment');
const InspectionRead    = get('InspectionRead');
const ActivityLog       = get('ActivityLog');

// 3. Relations (constraints:false)
if (Inspection && InspectionComment) {
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
} else {
  console.error('[models/index.js] ❌ Inspection or InspectionComment model missing – check filenames/model names');
}

if (User && InspectionComment) {
  User.hasMany(InspectionComment, { foreignKey: 'userId', constraints: false });
  InspectionComment.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });
}

if (InspectionComment) {
  InspectionComment.belongsTo(InspectionComment, {
    foreignKey: 'parentCommentId',
    as: 'parent',
    constraints: false
  });
}

if (Inspection && User) {
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
}

if (ActivityLog && Inspection) {
  ActivityLog.belongsTo(Inspection, { foreignKey: 'inspectionId', constraints: false });
  Inspection.hasMany(ActivityLog, { foreignKey: 'inspectionId', constraints: false });
}
if (ActivityLog && User) {
  ActivityLog.belongsTo(User, { foreignKey: 'userId', constraints: false });
  User.hasMany(ActivityLog, { foreignKey: 'userId', constraints: false });
}

// 4. Export
models.sequelize = sequelize;
models.Sequelize = Sequelize;
module.exports = models;
