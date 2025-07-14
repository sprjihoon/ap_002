const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CompleteSound = sequelize.define('CompleteSound', {
    url: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
  return CompleteSound;
}; 