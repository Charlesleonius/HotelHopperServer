let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const HotelRoom = sequelize.define('hotel_room', {
        hotelRoomID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'hotel_room_id' 
        },
        hotelID: {
            type: Sequelize.INTEGER,
            field: 'hotel_id'
        },
        roomTypeID: {
            type: Sequelize.INTEGER,
            field: 'room_type_id'
        },
        imageURL: {
            type: Sequelize.STRING,
            field: 'image_url'
        },
        price: Sequelize.INTEGER,
        roomCount: {
            type: Sequelize.INTEGER,
            field: 'room_count'
        }
    });
    return HotelRoom;
};
