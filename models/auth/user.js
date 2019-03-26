let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return User = sequelize.define('user', {
        user_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: Sequelize.STRING,
        last_name: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.STRING
    });
};