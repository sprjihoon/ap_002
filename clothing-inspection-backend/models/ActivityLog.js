const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  level: {
    type: DataTypes.ENUM('info','warn','error'),
    allowNull: false,
    defaultValue: 'info'
  }
}, {
  tableName: 'activity_logs',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = ActivityLog; 