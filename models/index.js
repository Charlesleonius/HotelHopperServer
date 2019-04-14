module.exports = {
    //Hotels
    Amenity: require('./hotels/amenity.js'),
    Hotel: require('./hotels/hotel.js'),
    RoomType: require('./hotels/room-type.js'),
    HotelAmenity: require('./hotels/hotel-amenity.js'),
    HotelRoom: require('./hotels/hotel-room.js'),
    //Auth
    PasswordResetToken: require('./auth/pswd-reset-token.js'),
    User: require('./auth/user'),
    //Reservations
    Reservation: require('./reservations/reservation.js'),
    ReservedRoom: require('./reservations/reserved-room.js'),
}