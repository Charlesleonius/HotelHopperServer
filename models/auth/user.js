let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return User = sequelize.define('user', {
        userID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_id'
        },
        first_name: Sequelize.STRING,
        last_name: Sequelize.STRING,
        email: Sequelize.STRING,
        password: Sequelize.STRING,
        isAdmin: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_admin'
        }
    });
};