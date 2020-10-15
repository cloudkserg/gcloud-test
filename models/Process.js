const {sequelize} = require('../config/db');
const { Model, DataTypes } = require('sequelize');
class Process extends Model {}


Process.init({
    createdAt: {
        type: DataTypes.DATE
    },
    finishedAt: {
        type: DataTypes.DATE,
        defaultValue: null,
        allowNull: true
    },
    processedCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    fullCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    startId: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
}, {
    sequelize
});

module.exports = Process;
