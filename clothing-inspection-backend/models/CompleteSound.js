const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize)=>{
  class CompleteSound extends Model {}
  CompleteSound.init({
    url:{ type:DataTypes.STRING, allowNull:false }
  },{ sequelize, modelName:'CompleteSound' });
  return CompleteSound;
}; 