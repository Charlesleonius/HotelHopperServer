const { Model } = require('objection');

class ReservedRoom extends Model {
    static get tableName() { return 'reserved_room'; }
    static get idColumn() { return 'reserved_room_id'; }
}

module.exports = ReservedRoom;