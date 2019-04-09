let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const HotelAmenity = sequelize.define('hotel_amenity', {
        hotelAmenityID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'hotel_amenity_id'
        },
        hotelID: {
            type: Sequelize.INTEGER,
            field: 'hotel_id'
        },
        amenityID: {
            type: Sequelize.INTEGER,
            field: 'amenity_id'
        }
    });
    return HotelAmenity;
};