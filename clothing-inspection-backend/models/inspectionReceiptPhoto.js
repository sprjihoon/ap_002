const { DataTypes } = require('sequelize');

const sequelize = require('../config/database');
const Inspection = require('./inspection');

const InspectionReceiptPhoto = sequelize.define('InspectionReceiptPhoto', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false
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

module.exports = InspectionReceiptPhoto;
