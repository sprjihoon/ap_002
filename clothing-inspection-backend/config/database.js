// config/database.js (PlanetScale DATABASE_URL 방식으로 수정)
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      rejectUnauthorized: true
    }
  },
  logging: false
});

module.exports = sequelize;
