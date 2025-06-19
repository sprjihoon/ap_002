const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InspectionComment = sequelize.define('InspectionComment', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  parentCommentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'inspection_comments'
});

module.exports = InspectionComment; 