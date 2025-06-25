// models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

/**
 * 중앙에서 생성한 sequelize 인스턴스를 재사용합니다.
 */
const sequelize = require('../config/database');

const models = {};

/**
 * 모델 파일 로드
 * 1) 함수(export = (sequelize, DataTypes) => Model) 형태 → 즉시 호출
 * 2) 클래스(export class extends Model ...) 형태 → 그대로 사용 (init() 로직은 각 파일 내부에서 수행되었다고 가정)
 */
fs.readdirSync(__dirname)
  .filter((file) =>
    file.indexOf('.') !== 0 &&
    file !== path.basename(__filename) &&
    file.slice(-3) === '.js'
  )
  .forEach((file) => {
    const imported = require(path.join(__dirname, file));
    let model;

    // 함수형 (old style)
    if (typeof imported === 'function' && !(imported.prototype instanceof Sequelize.Model)) {
      model = imported(sequelize, Sequelize.DataTypes);
    } else {
      // 클래스형 (new style)
      model = imported;
    }

    models[model.name] = model;
  });

/************************************************************
 * 관계 정의 – InspectionComment 중심
 ************************************************************/
if (models.InspectionComment && models.Inspection) {
  models.InspectionComment.belongsTo(models.Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection',
    onDelete: 'CASCADE',
  });

  models.InspectionComment.belongsTo(models.InspectionComment, {
    foreignKey: 'parentCommentId',
    as: 'parent',
    onDelete: 'CASCADE',
  });

  models.InspectionComment.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  // 역참조(선택)
  if (models.Inspection.hasMany) {
    models.Inspection.hasMany(models.InspectionComment, {
      foreignKey: 'inspectionId',
      as: 'comments',
      onDelete: 'CASCADE',
    });
  }
}

// associate() 루프는 비활성화 상태 유지 (중복 관계 방지)

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
