let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const User = sequelize.define('user', {
        user_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        reset_password_token: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.STRING,
    });
    return User;
};