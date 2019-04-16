const { Model } = require('objection');
class PopularDestination extends Model {
    static get tableName() { return 'popular_destinations'; }
    static get idColumn() { return 'city'; }
}

module.exports = PopularDestination;