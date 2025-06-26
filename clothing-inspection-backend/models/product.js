// models/product.js

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      company: {
        type: DataTypes.STRING,
        allowNull: true
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      size: {
        type: DataTypes.JSON,
        allowNull: true
      },
      color: {
        type: DataTypes.JSON,
        allowNull: true
      },
      wholesaler: {
        type: DataTypes.STRING,
        allowNull: true
      },
      wholesalerProductName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'products',
      timestamps: false
    }
  );

  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      size: {
        type: DataTypes.STRING,
        allowNull: true
      },
      color: {
        type: DataTypes.STRING,
        allowNull: true
      },
      barcode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    },
    {
      tableName: 'product_variants',
      timestamps: false
    }
  );

  // 관계 정의는 models/index.js에서 수행

  return { Product, ProductVariant };
};
