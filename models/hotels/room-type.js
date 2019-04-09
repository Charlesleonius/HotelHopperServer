let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    const RoomType = sequelize.define('room_type', {
        roomTypeID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'room_type_id'
        },
        title: Sequelize.STRING,
        description: Sequelize.STRING,
        persons: Sequelize.INTEGER,
        beds: Sequelize.INTEGER
    });
    return RoomType;
};
