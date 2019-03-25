let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return PasswordResetToken = sequelize.define('password_reset_token', {
        token: Sequelize.STRING,
        expires: Sequelize.DATE,
    });
};