module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define('ProductVariant', {
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    size: DataTypes.STRING,
    color: DataTypes.STRING,
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'product_variants',
    timestamps: false
  });

  // 관계 설정은 models/index.js에서 할 수도 있지만, 명시적 정의를 하려면 다음 추가
  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
      constraints: false
    });
  };

  return ProductVariant;
};
