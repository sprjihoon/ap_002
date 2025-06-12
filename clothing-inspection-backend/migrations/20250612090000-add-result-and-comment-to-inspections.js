'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (!table.result) {
      await queryInterface.addColumn('inspections', 'result', {
        type: Sequelize.ENUM('pass', 'fail'),
        allowNull: false,
        defaultValue: 'pass'
      });
    }
    if (!table.comment) {
      await queryInterface.addColumn('inspections', 'comment', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspections', 'comment');
    await queryInterface.removeColumn('inspections', 'result');
    // need to drop ENUM type manually in Postgres but in MySQL ignored
  }
}; 