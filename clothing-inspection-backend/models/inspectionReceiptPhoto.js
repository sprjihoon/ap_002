const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Inspection = require('./inspection');

const InspectionReceiptPhoto = sequelize.define('InspectionReceiptPhoto', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Inspection,
      key: 'id'
    }
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

// 관계 설정
Inspection.hasMany(InspectionReceiptPhoto, { foreignKey: 'inspectionId' });
InspectionReceiptPhoto.belongsTo(Inspection, { foreignKey: 'inspectionId' });

module.exports = InspectionReceiptPhoto; 