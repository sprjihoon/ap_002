'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (!table.company) {
      await queryInterface.addColumn('inspections', 'company', {
        type: Sequelize.STRING,
        allowNull: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspections', 'company');
  }
}; 