const {sequelize} = require('../config/db');
const { Model, DataTypes } = require('sequelize');
class StopWord extends Model {}

StopWord.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    sequelize
});

module.exports = StopWord;
