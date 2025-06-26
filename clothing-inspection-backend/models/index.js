  });
}

if (ActivityLog && Inspection) {
  ActivityLog.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    constraints: false
  });
  Inspection.hasMany(ActivityLog, {
    foreignKey: 'inspectionId',
    constraints: false
  });
}
if (ActivityLog && User) {
  ActivityLog.belongsTo(User, {
    foreignKey: 'userId',
    constraints: false
  });
  User.hasMany(ActivityLog, {
    foreignKey: 'userId',
    constraints: false
  });
}

if (Product && ProductVariant) {
  // Align alias with routes expecting `ProductVariants`
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
}

// 4. Export
models.sequelize = sequelize;
models.Sequelize = Sequelize;
module.exports = models;
