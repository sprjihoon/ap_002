module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('CompleteSounds', 'originalName', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('CompleteSounds', 'originalName');
  }
}; 