let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const Hotel = sequelize.define('hotel', {
        hotel_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: Sequelize.STRING,
        street: Sequelize.STRING,
        city: Sequelize.STRING,
        zip: Sequelize.STRING,
        state: Sequelize.STRING,
        image: Sequelize.STRING, //Image url
        stars: {
            type: Sequelize.INTEGER,
            validate: {
                min: 1,
                max: 5
            }
        },
        rating: {
            type: Sequelize.FLOAT,
            validate: {
                min: 1.0,
                max: 5.0
            },
            set(rating) { //Ensures the value is always rounded to one decimal place
                this.setDataValue('rating', Math.round(rating * 10) / 10);
            }
        }
    });
    return Hotel;
};
