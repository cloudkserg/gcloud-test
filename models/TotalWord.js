const {sequelize} = require('../config/db');
const { Model, DataTypes } = require('sequelize');
class TotalWord extends Model {}

TotalWord.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    sequelize
});

module.exports = TotalWord;
