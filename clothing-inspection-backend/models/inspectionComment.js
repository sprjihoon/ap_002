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

// associate 함수는 모델 정의가 모두 끝난 뒤 호출되도록 외부에서 실행해야 함
// 모델 참조 시 undefined 오류 방지
InspectionComment.associate = (models) => {
  const { Inspection, User, InspectionComment: Self } = models;

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
