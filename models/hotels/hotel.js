const { Model } = require('objection');
const knex = require('../../knex.js');

class Hotel extends Model {

    static get tableName() { return 'hotel'; }
    static get idColumn() { return 'hotel_id'; }

    static get relationMappings() {
        const HotelAmenity = require('./hotel-amenity.js');
        return {
            hotelAmenities: {
                relation: Model.HasManyRelation,
                modelClass: HotelAmenity,
                join: {
                    from: 'hotel.hotelId',
                    to: 'hotel_amenity.hotelId'
                }
            }
        };
    }

    static async getAvailableRooms(hotelId, startDate, endDate) {
        let rooms = await knex.raw(
            '( \
                SELECT room_type.room_type_id as "roomTypeId", room_type.title, \
                room_type.description, room_type.persons, room_type.beds, hotel_room.price, \
                ( \
                    CAST((hotel_room.room_count - ( \
                        SELECT count(*) FROM reserved_room \
                        WHERE ( \
                            (start_date >= ? AND start_date <= ?) \
                            OR (end_date >= ? AND end_date <= ?) \
                        ) \
                        AND reserved_room.status = \'pending\' \
                        AND reserved_room.hotel_id = hotel_room.hotel_id \
                        AND reserved_room.room_type_id = hotel_room.room_type_id \
                    )) as INTEGER) \
                ) as available \
                from hotel_room \
                join room_type on room_type.room_type_id = hotel_room.room_type_id \
                where hotel_room.hotel_id = ? \
            )',
            [
                startDate,
                endDate,
                startDate,
                endDate,
                hotelId
            ]
        );
        return rooms;
    }

}

module.exports = Hotel;
