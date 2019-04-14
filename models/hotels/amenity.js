const { Model } = require('objection');

class Amenity extends Model {
    static get tableName() { return 'amenity'; }
    static get idColumn() { return 'amenity_id'; }
}

module.exports = Amenity;