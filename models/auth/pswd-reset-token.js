const { Model } = require('objection');

class PasswordResetToken extends Model {
    static get tableName() { return 'password_reset_token'; }
    static get idColumn() { return 'password_reset_token_id'; }
    static get relationMappings() {
        const User = require('./user.js');
        return {
            user: {
                relation: Model.BelongsToOneRelation,
                modelClass: User,
                join: {
                    from: 'password_reset_token.userId',
                    to: 'user.userId'
                }
            }
        }
    }
}

module.exports = PasswordResetToken;