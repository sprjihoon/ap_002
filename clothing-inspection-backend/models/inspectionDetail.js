const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Inspection = require('./inspection');
const { ProductVariant } = require('./product');

const InspectionDetail = sequelize.define('InspectionDetail', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  productVariantId: {
    type: DataTypes.INTEGER,
    allowNull: false
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

module.exports = InspectionDetail;
