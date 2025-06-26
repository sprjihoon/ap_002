const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspectionRead = sequelize.define('InspectionRead', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'inspection_id'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  lastViewedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'lastViewedAt'
  }
}, {
  timestamps: false,
  tableName: 'inspection_reads'
});

module.exports = InspectionRead;
