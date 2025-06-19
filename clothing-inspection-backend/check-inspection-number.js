const sequelize = require('./config/database');

(async () => {
  try {
    const [results] = await sequelize.query("SELECT id, inspectionNumber FROM inspections WHERE inspectionNumber = ''");
    console.table(results);
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
})(); 