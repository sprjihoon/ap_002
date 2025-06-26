// models/inspectionComment.js — cleaned version
// 관계 정의는 전부 models/index.js 한 곳에서만 선언합니다.

module.exports = (sequelize, DataTypes) => {
  const InspectionComment = sequelize.define(
    'InspectionComment',
    {
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
      }
    },
    {
      tableName: 'inspection_comments',
      underscored: true
    }
  );

  // ✅ associate() 는 제거했습니다. (index.js 에서 constraints:false 로 관계 선언)
  return InspectionComment;
};
