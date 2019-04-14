const { Model } = require('objection');

class RoomType extends Model {
    static get tableName() { return 'room_type'; }
    static get idColumn() { return 'room_type_id'; }
}

module.exports = RoomType;