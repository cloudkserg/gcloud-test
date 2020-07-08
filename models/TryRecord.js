const {sequelize} = require('../config/db');
const { Model, DataTypes } = require('sequelize');
class TryRecord extends Model {}

TryRecord.init({
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    file: {
        type: DataTypes.STRING,
    },
    speed: {
      type: DataTypes.NUMBER,
    },
    google_speed: {
        type: DataTypes.NUMBER,
    },
    total: {
        type: DataTypes.STRING
    },
    rows: {
        type: DataTypes.TEXT
    },
    json: {
        type: DataTypes.TEXT
    },
    result: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize
});

module.exports = TryRecord;