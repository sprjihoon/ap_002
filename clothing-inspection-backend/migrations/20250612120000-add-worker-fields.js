'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // inspections: workStatus + assignedWorkerId
    const table = await queryInterface.describeTable('inspections');
    if (!table.workStatus) {
      await queryInterface.addColumn('inspections','workStatus',{
        type: Sequelize.ENUM('pending','in_progress','completed','error'),
        allowNull:false,
        defaultValue:'pending'
      });
    }
    if (!table.assignedWorkerId) {
      await queryInterface.addColumn('inspections','assignedWorkerId',{
        type: Sequelize.INTEGER,
        allowNull:true
        // PlanetScale 호환을 위해 FK 제거
      });
    }
    // inspection_details: handled counters
    const dtable = await queryInterface.describeTable('inspection_details');
    const add = async (col)=>{
      if (!dtable[col]) {
        await queryInterface.addColumn('inspection_details',col,{ type:Sequelize.INTEGER, allowNull:false, defaultValue:0 });
      }
    };
    await add('handledNormal');
    await add('handledDefect');
    await add('handledHold');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('inspections','workStatus');
    await queryInterface.removeColumn('inspections','assignedWorkerId');
    await queryInterface.removeColumn('inspection_details','handledNormal');
    await queryInterface.removeColumn('inspection_details','handledDefect');
    await queryInterface.removeColumn('inspection_details','handledHold');
  }
}; 
