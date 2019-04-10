let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return ReservedRoom = sequelize.define('reserved_room', {
        reservedRoomID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'reserved_room_id'
        },
        reservationID: {
            type: Sequelize.INTEGER,
            field: 'reservation_id'
        },
        hotelID: {
            type: Sequelize.INTEGER,
            field: 'hotel_id'
        },
        roomTypeID: {
            type: Sequelize.INTEGER,
            field: 'room_type_id'
        },
        startDate: {
            type: Sequelize.DATEONLY,
            field: 'start_date'
        },
        endDate: {
            type: Sequelize.DATEONLY,
            field: 'end_date'
        }
    });
};
