// ✅ 수정된 파일: PlanetScale 호환을 위해 외래키 제약조건 제거 완료

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Inspection = require('./inspection');

const InspectionReceiptPhoto = sequelize.define('InspectionReceiptPhoto', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 🔥 FK 제거: PlanetScale 호환
    // references: { model: Inspection, key: 'id' }
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'inspection_receipt_photos'
});

// 관계 설정 (Sequelize 레벨에서만 유지 → PlanetScale 호환)
Inspection.hasMany(InspectionReceiptPhoto, { foreignKey: 'inspectionId' });
InspectionReceiptPhoto.belongsTo(Inspection, { foreignKey: 'inspectionId' });

module.exports = InspectionReceiptPhoto;
