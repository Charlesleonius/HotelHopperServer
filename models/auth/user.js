let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const User = sequelize.define('user', {
        user_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        email: Sequelize.STRING,
        password: Sequelize.STRING
    });
    return User;
};