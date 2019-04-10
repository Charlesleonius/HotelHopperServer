let Sequelize = require('sequelize');

module.exports = function(sequelize, DataTypes) {
    return Reservation = sequelize.define('reservation', {
        reservationID: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            field: 'reservation_id'
        },
        hotelID: {
            type: Sequelize.INTEGER,
            field: 'hotel_id'
        },
        userID: {
            type: Sequelize.INTEGER,
            field: 'user_id'
        },
        startDate: {
            type: Sequelize.DATEONLY,
            field: 'start_date'
        },
        endDate: {
            type: Sequelize.DATEONLY,
            field: 'end_date'
        },
        totalCost: {
            type: Sequelize.DECIMAL,
            field: 'total_cost'
        }
    });
};
