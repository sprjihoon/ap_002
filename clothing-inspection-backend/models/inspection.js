const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  result: {
    type: DataTypes.ENUM('pass', 'fail'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Inspection; 