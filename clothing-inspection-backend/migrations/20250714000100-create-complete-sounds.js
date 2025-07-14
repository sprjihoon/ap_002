'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('CompleteSounds',{
      id:{ type:Sequelize.INTEGER, primaryKey:true, autoIncrement:true },
      url:{ type:Sequelize.STRING, allowNull:false },
      createdAt:{ type:Sequelize.DATE, allowNull:false, defaultValue:Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt:{ type:Sequelize.DATE, allowNull:false, defaultValue:Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  down: async (queryInterface)=>{
    await queryInterface.dropTable('CompleteSounds');
  }
}; 