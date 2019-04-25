const { Model } = require('objection');

class ReservedRoom extends Model {
    static get tableName() { return 'reserved_room'; }
    static get idColumn() { return 'reserved_room_id'; }
    static get relationMappings() {
        const RoomType = require('../hotels/room-type.js');
        return {
            roomType: {
                relation: Model.HasOneRelation,
                modelClass: RoomType,
                join: {
                    from: 'reserved_room.roomTypeId',
                    to: 'room_type.roomTypeId'
                }
            }
        };
    }
}

module.exports = ReservedRoom;
