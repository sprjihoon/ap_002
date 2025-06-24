// ✅ 수정된 파일: PlanetScale 호환을 위해 외래키 제약조건 제거 완료

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
}, {
  timestamps: false,
  tableName: 'products'
});

const ProductVariant = sequelize.define('ProductVariant', {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false
    // 🔥 FK 제거: PlanetScale 호환
    // references: { model: Product, key: 'id' },
    // onDelete: 'CASCADE'
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

// ✅ Sequelize 관계는 유지 가능 (PlanetScale 호환)
Product.hasMany(ProductVariant, {
  foreignKey: 'productId',
  as: 'ProductVariants',
  constraints: false
});
ProductVariant.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
  constraints: false
});

module.exports = { Product, ProductVariant };
