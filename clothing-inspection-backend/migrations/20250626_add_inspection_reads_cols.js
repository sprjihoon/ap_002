module.exports = {
  up: async (qi, Sequelize) => {
    const table = await qi.describeTable('inspection_reads');

    if (!table.inspection_id) {
      await qi.addColumn('inspection_reads', 'inspection_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
      await qi.addIndex('inspection_reads', ['inspection_id']);
    }

    if (!table.user_id) {
      await qi.addColumn('inspection_reads', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      });
      await qi.addIndex('inspection_reads', ['user_id']);
    }
  },

  down: async qi => {
    const table = await qi.describeTable('inspection_reads');

    if (table.inspection_id) {
      try { await qi.removeIndex('inspection_reads', ['inspection_id']); } catch(e){}
      await qi.removeColumn('inspection_reads', 'inspection_id');
    }

    if (table.user_id) {
      try { await qi.removeIndex('inspection_reads', ['user_id']); } catch(e){}
      await qi.removeColumn('inspection_reads', 'user_id');
    }
  }
}; 