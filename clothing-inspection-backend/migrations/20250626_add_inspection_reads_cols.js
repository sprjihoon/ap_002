module.exports = {
  up: async (qi, Sequelize) => {
    await qi.addColumn('inspection_reads', 'inspection_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await qi.addColumn('inspection_reads', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await qi.addIndex('inspection_reads', ['inspection_id']);
    await qi.addIndex('inspection_reads', ['user_id']);
  },

  down: async qi => {
    await qi.removeIndex('inspection_reads', ['inspection_id']);
    await qi.removeIndex('inspection_reads', ['user_id']);
    await qi.removeColumn('inspection_reads', 'inspection_id');
    await qi.removeColumn('inspection_reads', 'user_id');
  }
}; 