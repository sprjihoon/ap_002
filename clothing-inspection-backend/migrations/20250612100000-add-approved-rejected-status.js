'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // MySQL 기준. Postgres 는 ENUM 타입 별도 ALTER
  async up (queryInterface, Sequelize) {
    // 기존 status 열을 새 ENUM 집합으로 교체
    await queryInterface.sequelize.query(
      "ALTER TABLE inspections MODIFY COLUMN status ENUM('pending','in_progress','completed','approved','rejected') NOT NULL DEFAULT 'pending';"
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "ALTER TABLE inspections MODIFY COLUMN status ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending';"
    );
  }
}; 