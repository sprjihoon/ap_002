const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('clothing_inspection', 'root', '0425', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

module.exports = sequelize; 