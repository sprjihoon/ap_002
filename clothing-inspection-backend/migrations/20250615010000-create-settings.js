'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settings', {
      key: {
        type: Sequelize.STRING(100),
        primaryKey: true,
        allowNull: false
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settings');
  }
}; 