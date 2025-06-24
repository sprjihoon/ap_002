'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('inspections', 'inspector_id', {
      type: Sequelize.INTEGER,
      allowNull: true
      // PlanetScale 호환을 위해 FK 제거
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('inspections', 'inspector_id');
  }
}; 
