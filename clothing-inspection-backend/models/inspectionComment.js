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

  // Associations are defined in an `associate` method and executed after all
  // models are loaded to avoid circular dependency issues.
  InspectionComment.associate = (models) => {
    InspectionComment.belongsTo(models.Inspection, {
      foreignKey: 'inspectionId',
      as: 'inspection',
      onDelete: 'CASCADE',
      constraints: false,
    });

    InspectionComment.belongsTo(models.InspectionComment, {
      foreignKey: 'parentCommentId',
      as: 'parent',
      onDelete: 'CASCADE',
      constraints: false,
    });

    InspectionComment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE',
      constraints: false,
    });

    if (models.Inspection && models.Inspection.hasMany) {
      models.Inspection.hasMany(InspectionComment, {
        foreignKey: 'inspectionId',
        as: 'comments',
        onDelete: 'CASCADE',
        constraints: false,
      });
    }
  };

  return InspectionComment;
};
