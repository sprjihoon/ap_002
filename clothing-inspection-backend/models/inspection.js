const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  inspectionName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '검수 전표 이름 (업체명+날짜+버전)'
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  workStatus: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'error'),
    allowNull: false,
    defaultValue: 'pending'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  result: {
    type: DataTypes.ENUM('pass', 'fail'),
    allowNull: false
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejectReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inspector_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: false,
  tableName: 'inspections'
});

Inspection.associate = models => {
  Inspection.belongsTo(models.User, {
    foreignKey: 'inspector_id',
    as: 'inspector',
    constraints: false
  });

  // Link to read tracking (no FK in PlanetScale)
  Inspection.hasMany(models.InspectionRead, {
    foreignKey: 'inspection_id',
    constraints: false
  });
};

module.exports = Inspection;
