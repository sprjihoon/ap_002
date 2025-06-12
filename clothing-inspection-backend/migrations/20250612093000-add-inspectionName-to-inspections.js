'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (!table.inspectionName) {
      await queryInterface.addColumn('inspections', 'inspectionName', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspections', 'inspectionName');
  }
}; 