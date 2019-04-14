const { Model } = require('objection');
class User extends Model {
  static get tableName() { return 'user'; }
  static get idColumn() { return 'user_id'; }
}

module.exports = User;