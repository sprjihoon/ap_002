module.exports = {
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'clothing_inspection',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: {
      decimalNumbers: true,
      ssl: {
        require: true,
        rejectUnauthorized: true
      }
    },
    logging: false
  },
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'clothing_inspection',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions: { decimalNumbers: true },
    logging: console.log
  },
  test: {
    storage: ':memory:',
    dialect: 'sqlite',
    logging: false
  }
}; 