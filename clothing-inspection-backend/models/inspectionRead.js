const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspectionRead = sequelize.define('InspectionRead', {
  lastViewedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'inspection_reads'
});

module.exports = InspectionRead;
