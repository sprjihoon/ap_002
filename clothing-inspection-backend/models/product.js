// models/product.js – defines Product and ProductVariant as separate models

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      company: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      size: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      color: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      wholesaler: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      wholesalerProductName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'products',
      timestamps: false,
    }
  );

  return Product;
};
