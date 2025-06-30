// models/index.js – robust dynamic loader, FK‑free, guards against undefined

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// 1. Dynamic model loading – load *.js except this file
const models = {};

fs.readdirSync(__dirname)
  .filter(
    (file) => file.endsWith('.js') && file !== path.basename(__filename)
  )
  .forEach((file) => {
    const imported = require(path.join(__dirname, file));
    let model;

    // 함수형 export = (sequelize, DataTypes) => Model
    if (
      typeof imported === 'function' &&
      !(imported.prototype instanceof Sequelize.Model)
    ) {
      model = imported(sequelize, Sequelize.DataTypes);
    } else {
      // 클래스형 export class extends Model
      model = imported;
    }

    if (!model || typeof model.name !== 'string' || model.name.length === 0) {
      console.warn(`[models/index.js] ⚠️  Skip invalid model export in ${file}`);
      return;
    }

    // original key (exact name)
    models[model.name] = model;

    // PascalCase alias (case‑insensitive convenience)
    const pascal = `${model.name[0].toUpperCase()}${model.name.slice(1)}`;
    if (!models[pascal]) models[pascal] = model;
  });

// 2. Helper: case‑insensitive getter
const get = (key) =>
  models[key] || models[key?.toLowerCase?.()] || models[key?.toUpperCase?.()];

const User              = get('User');
const Inspection        = get('Inspection');
const InspectionComment = get('InspectionComment');
const InspectionRead    = get('InspectionRead');
const ActivityLog       = get('ActivityLog');
const Product           = get('Product');
const ProductVariant    = get('ProductVariant');
const InspectionDetail  = get('InspectionDetail');
const InspectionReceiptPhoto = get('InspectionReceiptPhoto');
const WorkerScan        = get('WorkerScan');

// 3. Relations (all constraints:false to suppress FK creation)
if (Inspection && InspectionComment) {
  Inspection.hasMany(InspectionComment, {
    foreignKey: 'inspectionId',
    as: 'comments',
    onDelete: 'CASCADE',
    constraints: false
  });
  InspectionComment.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'inspection',
    constraints: false
  });
} else {
  console.error('[models/index.js] ❌ Missing Inspection or InspectionComment model – check filenames/model names');
}

if (User && InspectionComment) {
  User.hasMany(InspectionComment, {
    foreignKey: 'userId',
    constraints: false
  });
  InspectionComment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
    constraints: false
  });
}

if (InspectionComment) {
  // self‑reply
  InspectionComment.belongsTo(InspectionComment, {
    foreignKey: 'parentCommentId',
    as: 'parent',
    constraints: false
  });
  InspectionComment.hasMany(InspectionComment, {
    foreignKey: 'parentCommentId',
    as: 'replies',
    constraints: false
  });
}

if (Inspection && User) {
  Inspection.belongsToMany(User, {
    through: InspectionRead,
    foreignKey: 'inspectionId',
    otherKey: 'userId',
    as: 'readers',
    constraints: false
  });
  User.belongsToMany(Inspection, {
    through: InspectionRead,
    foreignKey: 'userId',
    otherKey: 'inspectionId',
    constraints: false
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

// Association: Inspection ⇄ InspectionDetail
if (Inspection && InspectionDetail) {
  Inspection.hasMany(InspectionDetail, {
    foreignKey: 'inspectionId',
    as: 'InspectionDetails',
    constraints: false
  });
  InspectionDetail.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'Inspection',
    constraints: false
  });
}

// Association: ProductVariant ⇄ InspectionDetail
if (ProductVariant && InspectionDetail) {
  ProductVariant.hasMany(InspectionDetail, {
    foreignKey: 'productVariantId',
    as: 'InspectionDetails',
    constraints: false
  });
  InspectionDetail.belongsTo(ProductVariant, {
    foreignKey: 'productVariantId',
    as: 'ProductVariant',
    constraints: false
  });
}

// Association: Inspection ⇄ InspectionReceiptPhoto
if (Inspection && InspectionReceiptPhoto) {
  Inspection.hasMany(InspectionReceiptPhoto, {
    foreignKey: 'inspectionId',
    as: 'InspectionReceiptPhotos',
    constraints: false
  });
  InspectionReceiptPhoto.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'Inspection',
    constraints: false
  });
}

// belongsTo inspector association
if (User && Inspection) {
  Inspection.belongsTo(User, {
    foreignKey: 'inspector_id',
    as: 'inspector',
    constraints: false
  });
  User.hasMany(Inspection, {
    foreignKey: 'inspector_id',
    as: 'inspections',
    constraints: false
  });
}

if (WorkerScan && User) {
  WorkerScan.belongsTo(User, {
    foreignKey: 'userId',
    as: 'worker',
    constraints: false
  });
  User.hasMany(WorkerScan, {
    foreignKey: 'userId',
    constraints: false
  });
}

if (WorkerScan && Inspection) {
  WorkerScan.belongsTo(Inspection, {
    foreignKey: 'inspectionId',
    as: 'Inspection',
    constraints: false
  });
  Inspection.hasMany(WorkerScan, {
    foreignKey: 'inspectionId',
    as: 'scans',
    constraints: false
  });
}

if (WorkerScan && InspectionDetail) {
  WorkerScan.belongsTo(InspectionDetail, {
    foreignKey: 'detailId',
    as: 'detail',
    constraints: false
  });
  InspectionDetail.hasMany(WorkerScan, {
    foreignKey: 'detailId',
    as: 'scans',
    constraints: false
  });
}

// 4. Export
models.sequelize = sequelize;
models.Sequelize = Sequelize;
module.exports = models;
