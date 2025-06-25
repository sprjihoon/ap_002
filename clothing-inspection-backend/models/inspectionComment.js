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

InspectionComment.associate = (models) => {
  InspectionComment.belongsTo(models.Inspection, {
    foreignKey: 'inspectionId',
    constraints: false
  });

  InspectionComment.belongsTo(models.InspectionComment, {
    as: 'parent',
    foreignKey: 'parentCommentId',
    constraints: false
  });

  InspectionComment.belongsTo(models.User, {
    foreignKey: 'userId',
    constraints: false
  });
};

module.exports = InspectionComment;
