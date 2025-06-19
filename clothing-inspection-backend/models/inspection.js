const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  clientName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inspectionName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  result: {
    type: DataTypes.ENUM('pass','fail'),
    allowNull: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references:{ model:'users', key:'id' }
  },
  assignedWorkerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references:{ model:'users', key:'id' }
  },
  rejectReason:{
    type: DataTypes.STRING,
    allowNull: true
  },
  inspectionType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  inspectionDetails: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  workStatus: {
    type: DataTypes.ENUM('pending','in_progress','completed','error'),
    allowNull: false,
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  tableName: 'inspections'
});

module.exports = Inspection; 