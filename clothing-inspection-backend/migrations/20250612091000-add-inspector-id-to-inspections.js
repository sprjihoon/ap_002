'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('inspections', 'inspector_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      // PlanetScale does not support foreign keys
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspections', 'inspector_id');
  }
}; 
