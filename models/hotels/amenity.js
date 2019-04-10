let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const Amenity = sequelize.define('amenity', {
        amenityID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'amenity_id'
        },
        title: Sequelize.STRING,
        imageURL: {
            type: Sequelize.STRING,
            field: 'image_url'
        },
    });
    return Amenity;
};
