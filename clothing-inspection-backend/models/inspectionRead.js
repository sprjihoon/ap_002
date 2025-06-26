const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspectionRead = sequelize.define('InspectionRead', {
  inspection_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
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
