const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  company: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '업체명'
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '제품명'
  },
  size: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '사이즈 (쉼표로 구분된 여러 값)',
    get() {
      const rawValue = this.getDataValue('size');
      return rawValue ? rawValue.split(',') : [];
    },
    set(value) {
      this.setDataValue('size', Array.isArray(value) ? value.join(',') : value);
    }
  },
  color: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '컬러 (쉼표로 구분된 여러 값)',
    get() {
      const rawValue = this.getDataValue('color');
      return rawValue ? rawValue.split(',') : [];
    },
    set(value) {
      this.setDataValue('color', Array.isArray(value) ? value.join(',') : value);
    }
  },
  wholesaler: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '도매처명'
  },
  wholesalerProductName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '도매처제품명'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '로케이션정보 (선택)'
  }
}, {
  timestamps: true,
  tableName: 'products'
});

// 제품의 실제 조합을 저장하는 모델
const ProductVariant = sequelize.define('ProductVariant', {
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '단일 사이즈 (선택)'
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '단일 컬러 (선택)'
  },
  barcode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '바코드번호 (전체 제품에서 유니크)'
  }
}, {
  timestamps: true,
  tableName: 'product_variants'
});

// 관계 설정
Product.hasMany(ProductVariant, { foreignKey: 'productId' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId' });

module.exports = { Product, ProductVariant }; 