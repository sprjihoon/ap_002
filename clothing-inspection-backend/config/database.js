// config/database.js (PlanetScale DATABASE_URL 방식으로 수정)
require('dotenv').config();
const { Sequelize } = require('sequelize');

if (!process.env.DATABASE_URL) {
  throw new Error('❌ Missing DATABASE_URL');
}

const sanitizedUrl = process.env.DATABASE_URL.replace(/([?&])sslaccept=[^&]+&?/i, '$1').replace(/([?&])$/, '');

const sequelize = new Sequelize(sanitizedUrl, {
  dialect: 'mysql',
  dialectOptions: {
    ssl: {
      rejectUnauthorized: true
    }
  },
  logging: false,
  define: {
    foreignKeyConstraints: false
  }
});

module.exports = sequelize;
