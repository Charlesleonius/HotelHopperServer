"use strict";

var Sequelize = require("sequelize");
let sequelize = new Sequelize(process.env.PSQL_URI, {
    dialect: 'postgres',
    operatorsAliases: true,
    logging: true,
    define: {
        underscored: true,
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
const Hotel = sequelize.import('hotels/hotel.js');
const HotelRoom = sequelize.import('hotels/hotel-room.js');
const RoomType = sequelize.import('hotels/room-type.js');
const Reservation = sequelize.import('reservations/reservation.js')

User.prototype.toJSON =  function () { //Hide password when returning user objects
    var values = Object.assign({}, this.get());
    delete values.password;
    return values;
}

/*
* Associations
*/ 

//User <-> Password reset token
User.hasOne(PasswordResetToken, {foreignKey: 'user_id', sourceKey: 'user_id'});
PasswordResetToken.belongsTo(User, {foreignKey: 'user_id', sourceKey: 'user_id'});

//Hotel <--> HotelRoom -> RoomType
Hotel.hasMany(HotelRoom, {foreignKey: 'hotel_id', sourceKey: 'hotel_id'});
HotelRoom.belongsTo(Hotel, {foreignKey: 'hotel_id', sourceKey: 'hotel_id'});
RoomType.hasOne(HotelRoom, {foreignKey: 'room_type_id', sourceKey: 'room_type_id'});

module.exports = {
    sequelize,
    User,
    PasswordResetToken,
    Hotel,
    HotelRoom,
    RoomType,
    Reservation
}