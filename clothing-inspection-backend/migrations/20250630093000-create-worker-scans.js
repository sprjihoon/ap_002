module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('worker_scans', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      inspectionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        index: true
      },
      detailId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        index: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        index: true
      },
      result: {
        type: Sequelize.ENUM('normal', 'defect', 'hold'),
        allowNull: false
      },
      qualityGrade: {
        type: Sequelize.ENUM('A','B','C','D','E'),
        allowNull: true
      },
      createdAt: {
        type: 'TIMESTAMP',
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('worker_scans',['inspectionId']);
    await queryInterface.addIndex('worker_scans',['userId']);
    await queryInterface.addIndex('worker_scans',['detailId']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('worker_scans');
  }
}; 