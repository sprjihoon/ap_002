'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (!table.inspector_id) {
      await queryInterface.addColumn('inspections', 'inspector_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (table.inspector_id) {
      await queryInterface.removeColumn('inspections', 'inspector_id');
    }
  }
}; 
