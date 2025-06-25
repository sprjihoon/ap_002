// models/inspectionComment.js (updated to avoid circular reference)
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

// 관계 정의 — sequelize.models 를 직접 참조해 순환 참조 문제 해결
InspectionComment.associate = () => {
  const { Inspection, User, InspectionComment: Self } = sequelize.models;

  InspectionComment.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    constraints: false
  });

  InspectionComment.belongsTo(Self, {
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
