const { Model } = require('objection');

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
}

module.exports = Hotel;