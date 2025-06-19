const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LabelTemplate = sequelize.define('LabelTemplate', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60 // mm
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 40 // mm
  },
  jsonSpec: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'label_templates',
  timestamps: true
});

module.exports = LabelTemplate; 