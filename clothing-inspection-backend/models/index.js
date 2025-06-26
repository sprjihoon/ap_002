// models/index.js – tolerant to model name casing, FK-free

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// 1. Dynamic model loading (adds both original key and PascalCase key)
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

    // original key (whatever model.name is)
    models[model.name] = model;

    // PascalCase alias to avoid case‑sensitive misses (e.g., inspection → Inspection)
    const pascal = model.name.charAt(0).toUpperCase() + model.name.slice(1);
    models[pascal] = model;
  });

// 2. Safe getters
const get = (key) => models[key] || models[key && key.toLowerCase()] || models[key && key.toUpperCase()];

const User              = get('User');
const Inspection        = get('Inspection');
const InspectionComment = get('InspectionComment');
const InspectionRead    = get('InspectionRead');
const ActivityLog       = get('ActivityLog');

// 3. Relations (all constraints:false & guards)
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
