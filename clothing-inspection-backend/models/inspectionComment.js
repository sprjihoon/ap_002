// models/inspectionComment.js
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
  inspectionId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
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

const Inspection = require('./inspection');
const User = require('./user');

InspectionComment.associate = () => {
  InspectionComment.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    constraints: false
  });

  InspectionComment.belongsTo(InspectionComment, {
    as: 'parent',
    foreignKey: 'parentCommentId',
    constraints: false
  });

  InspectionComment.belongsTo(User, {
    foreignKey: 'userId',
    constraints: false
  });
};

module.exports = InspectionComment;
