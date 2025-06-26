module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductVariant', {
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
};
