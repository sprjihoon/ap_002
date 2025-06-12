'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (table.updatedAt) {
      await queryInterface.changeColumn('inspections', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    } else {
      await queryInterface.addColumn('inspections', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }
  },
  down: async (queryInterface, Sequelize) => {
    // No down migration to avoid data loss
  },
}; 