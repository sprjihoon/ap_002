// models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

/**
 * 중앙에서 생성한 sequelize 인스턴스를 재사용합니다.
 * (config/database.js 는 sync‑db.js 등에서 이미 사용 중인 파일입니다)
 */
const sequelize = require('../config/database');

const models = {};

// 현재 폴더의 모든 모델 파일을 동적으로 로드 (index.js 자신 제외)
fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== path.basename(__filename) &&
      file.slice(-3) === '.js'
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
  });

/************************************************************
 * 관계 정의 – InspectionComment 중심
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

  // (역참조) 검사 → 댓글 목록
  models.Inspection.hasMany(models.InspectionComment, {
    foreignKey: 'inspectionId',
    as: 'comments',
    onDelete: 'CASCADE',
  });
}

// 더 이상 per‑model associate() 자동 호출은 사용하지 않으므로 주석 처리
// Object.values(models).forEach((model) => {
//   if (typeof model.associate === 'function') {
//     model.associate(models);
//   }
// });

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
