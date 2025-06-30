const define = (sequelize, DataTypes) => {
  const WorkerScan = sequelize.define('WorkerScan', {
    inspectionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    detailId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    result: {
      type: DataTypes.ENUM('normal', 'defect', 'hold'),
      allowNull: false
    },
    qualityGrade: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D', 'E'),
      allowNull: true
    }
  }, {
    tableName: 'worker_scans',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: false
  });

  return WorkerScan;
};

module.exports = define; 