// ✅ 수정된 파일: PlanetScale 호환을 위해 외래키 제약조건 제거 완료

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Inspection = require('./inspection');
const { ProductVariant } = require('./product');

const InspectionDetail = sequelize.define('InspectionDetail', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 🔥 FK 제거: PlanetScale 호환
    // references: { model: Inspection, key: 'id' },
    // onDelete: 'CASCADE'
  },
  productVariantId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 🔥 FK 제거
    // references: { model: ProductVariant, key: 'id' }
  },
  totalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  normalQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  defectQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  handledNormal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  handledDefect: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  handledHold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  result: {
    type: DataTypes.ENUM('pass', 'fail'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  qualityGrade: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E'),
    allowNull: true
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'inspection_details'
});

// ✅ Sequelize 관계는 유지 가능 (PlanetScale 호환)
Inspection.hasMany(InspectionDetail, {
  foreignKey: 'inspectionId',
  constraints: false
});
InspectionDetail.belongsTo(Inspection, {
  foreignKey: 'inspectionId',
  constraints: false
});

ProductVariant.hasMany(InspectionDetail, {
  foreignKey: 'productVariantId',
  constraints: false
});
InspectionDetail.belongsTo(ProductVariant, {
  foreignKey: 'productVariantId',
  constraints: false
});

module.exports = InspectionDetail;
