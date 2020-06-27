const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: __dirname + '/../database.sqlite'
});
module.exports = {
  sequelize
};
