// models/inspectionComment.js

module.exports = (sequelize, DataTypes) => {
  const InspectionComment = sequelize.define(
    'InspectionComment',
    {
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      parentCommentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      inspectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'inspection_comments',
      underscored: true,
    }
  );

  // ⚠️ Do NOT add an associate() method here.
  // Associations are defined centrally in models/index.js to avoid circular dependencies.

  return InspectionComment;
};
