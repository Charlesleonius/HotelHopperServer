const { Model } = require('objection');

class HotelAmenity extends Model {
    static get tableName() { return 'hotel_amenity'; }
    static get idColumn() { return ['amenity_id', 'hotel_id']; }
    static get relationMappings() {
        const Amenity = require('./amenity.js');
        return {
            amenity: {
                relation: Model.HasOneRelation,
                modelClass: Amenity,
                join: {
                    from: 'hotel_amenity.amenityId',
                    to: 'amenity.amenityId'
                }
            }
        };
    }
}

module.exports = HotelAmenity;