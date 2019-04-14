const { Model } = require('objection');
class HotelRoom extends Model {
    static get tableName() { return 'hotel_room'; }
    static get idColumn() { return 'hotel_room_id'; }
}

module.exports = HotelRoom;