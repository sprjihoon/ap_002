'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activity_logs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      inspectionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // PlanetScale does not support foreign keys
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // PlanetScale does not support foreign keys
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      level: {
        type: Sequelize.ENUM('info','warn','error'),
        allowNull: false,
        defaultValue: 'info'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activity_logs');
  }
}; 
