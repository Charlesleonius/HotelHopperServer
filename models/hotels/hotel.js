let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const Hotel = sequelize.define('hotel', {
        hotelID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'hotel_id'
        },
        title: Sequelize.STRING,
        description: Sequelize.STRING,
        street: Sequelize.STRING,
        city: Sequelize.STRING,
        state: Sequelize.STRING,
        zip: Sequelize.STRING,
        country: Sequelize.STRING,
        address: Sequelize.STRING,
        mapURL: {
            type: Sequelize.STRING,
            field: 'map_url'
        },
        imageURL: {
            type: Sequelize.STRING,
            field: 'image_url'
        },
        stars: {
            type: Sequelize.INTEGER,
            validate: {
                min: 1,
                max: 5
            }
        },
        rating: {
            type: DataTypes.DECIMAL(10,1),
            validate: {
                min: 1.0,
                max: 10.0
            },
            set(rating) { //Ensures the value is always rounded to one decimal place
                this.setDataValue('rating', Math.round(rating * 10) / 10);
            }
        },
        latitude: Sequelize.FLOAT,
        longitude: Sequelize.FLOAT
    }, {
        underscored: true
    });
    return Hotel;
};
