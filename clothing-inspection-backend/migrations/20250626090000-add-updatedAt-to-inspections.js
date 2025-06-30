"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (!table.updatedAt) {
      await queryInterface.addColumn('inspections', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('inspections');
    if (table.updatedAt) {
      await queryInterface.removeColumn('inspections', 'updatedAt');
    }
  }
}; 