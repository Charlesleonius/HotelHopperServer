let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return User = sequelize.define('user', {
        userID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'user_id'
        },
        firstName: {
            type: Sequelize.STRING,
            field: 'first_name'
        },
        lastName: {
            type: Sequelize.STRING,
            field: 'last_name'
        },
        email: Sequelize.STRING,
        password: Sequelize.STRING,
        isAdmin: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            field: 'is_admin'
        }
    });
};