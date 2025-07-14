module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CompleteSounds', 'order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('CompleteSounds', 'order');
  }
}; 