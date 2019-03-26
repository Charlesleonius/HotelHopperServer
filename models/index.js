"use strict";

var Sequelize = require("sequelize");
let sequelize = new Sequelize(process.env.PSQL_URI, {
    dialect: 'postgres',
    operatorsAliases: true,
    logging: false,
    define: {
        freezeTableName: true,
        charset: 'utf8',
        dialectOptions: {
            useUTC: false,
            collate: 'utf8_general_ci'    
        },
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at'
    }
});

const User = sequelize.import('auth/user.js');
const PasswordResetToken = sequelize.import('auth/passwordResetToken.js');

User.prototype.toJSON =  function () { //Hide password when returning user objects
    var values = Object.assign({}, this.get());
    delete values.password;
    return values;
}

//Associations
User.hasOne(PasswordResetToken, {foreignKey: 'user_id', sourceKey: 'user_id'});
PasswordResetToken.belongsTo(User, {foreignKey: 'user_id', sourceKey: 'user_id'});

module.exports = {
    User,
    PasswordResetToken,
    sequelize
}