const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING(100),
    primaryKey: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'settings',
  timestamps: false
});

module.exports = Setting;
