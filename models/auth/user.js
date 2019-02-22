var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
    id: ObjectId,
    email: { 
        type: String, 
        index: true
    },
    password: String
});

var User = mongoose.model('users', UserSchema);

module.exports = {
    User: User
}