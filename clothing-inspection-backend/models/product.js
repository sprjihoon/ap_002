const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    // 여러 사이즈를 배열(JSON)로 저장
    type: DataTypes.JSON,
    allowNull: true
  },
  color: {
    // 여러 컬러를 배열(JSON)로 저장
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
}, {
  timestamps: false,
  tableName: 'products'
});

const ProductVariant = sequelize.define('ProductVariant', {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    },
    onDelete: 'CASCADE'
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
}, {
  timestamps: false,
  tableName: 'product_variants'
});

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'ProductVariants' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

module.exports = { Product, ProductVariant }; 