const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  inspectionName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '검수 전표 이름 (업체명+날짜+버전)'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  result: {
    type: DataTypes.ENUM('pass', 'fail'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'inspections'
});

module.exports = Inspection; 