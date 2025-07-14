const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompleteSound = sequelize.define('CompleteSound', {
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
  return CompleteSound;
}; 