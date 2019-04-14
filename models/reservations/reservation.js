const { Model } = require('objection');

class Reservation extends Model {
    static get tableName() { return 'reservation'; }
    static get idColumn() { return 'reservation_id'; }
}

module.exports = Reservation;