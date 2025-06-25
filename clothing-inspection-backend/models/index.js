// models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];

const models = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Load all model files in this directory (except this one)
fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  });

/************************************************************
 * Centralized relationship definitions
 * ---------------------------------------------------------
 * Keep everything here to avoid circular dependency issues.
 ************************************************************/
if (models.InspectionComment && models.Inspection) {
  // 댓글 → 검사
  models.InspectionComment.belongsTo(models.Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection',
    onDelete: 'CASCADE',
  });

  // 대댓글(parent) 관계
  models.InspectionComment.belongsTo(models.InspectionComment, {
    foreignKey: 'parentCommentId',
    as: 'parent',
    onDelete: 'CASCADE',
  });

  // 댓글 → 작성자
  models.InspectionComment.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  // (선택) 검사 → 댓글들  (역참조용, 필수 아님)
  models.Inspection.hasMany(models.InspectionComment, {
    foreignKey: 'inspectionId',
    as: 'comments',
    onDelete: 'CASCADE',
  });
}

// 🚫 Disable legacy per‑model associate() execution
// Object.values(models).forEach((model) => {
//   if (typeof model.associate === 'function') {
//     model.associate(models);
//   }
// });

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
