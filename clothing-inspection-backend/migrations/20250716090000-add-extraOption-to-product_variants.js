module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('product_variants', 'extraOption', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'color'
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('product_variants', 'extraOption');
  }
}; 