const { Model } = require('objection');

class Reservation extends Model {
    static get tableName() { return 'reservation'; }
    static get idColumn() { return 'reservation_id'; }
    static get relationMappings() {
        const ReservedRoom = require('./reserved-room.js');
        const Hotel = require('../hotels/hotel.js');
        return {
            reservedRooms: {
                relation: Model.HasManyRelation,
                modelClass: ReservedRoom,
                join: {
                    from: 'reservation.reservationId',
                    to: 'reserved_room.reservationId'
                }
            },
            hotel: {
                relation: Model.HasOneRelation,
                modelClass: Hotel,
                join: {
                    from: 'reservation.hotelId',
                    to: 'hotel.hotelId'
                }
            }
        };
    }
}

module.exports = Reservation;
