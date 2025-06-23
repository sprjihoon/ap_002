require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'clothing_inspection',
  DB_USER = 'root',
  DB_PASS,
  DB_PASSWORD
} = process.env;

// Use DB_PASSWORD if provided, otherwise fall back to DB_PASS (old env name)
const dbPassword = DB_PASSWORD || DB_PASS || '';

const sequelize = new Sequelize(DB_NAME, DB_USER, dbPassword, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false
});

module.exports = sequelize; 