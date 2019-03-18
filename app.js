//Imports
require('dotenv').config()
global._ = require('lodash');
var express = require("express");
var bodyParser = require("body-parser");
let passport = require("passport");
var passportJWT = require("passport-jwt");
global.mongoose = require("mongoose");
let User = require('./models/auth/user.js').User

//JWT Helpers
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
global.jwtOptions = {}
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'wEKNYENCpc4HvogKJs0pa1XPD5vbx4ZsxaYzZ8SUwMGBrgOv0A4zK2ZZni2jfFOAkGPdrj7gwJI4j6W2IOI3fT0gYjBmjOKu7FWK';

var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
    User.findOne({ email: jwt_payload.email }).then(user => {
        if (user) {
            next(null, user);
        } else {
            res.status(401)
        }
    })
});

passport.use(strategy);

const app = express()
const port = process.env.PORT || 3000
app.use(passport.initialize());

app.use(bodyParser.json({
    extended: true
}));

global.mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true }).then(db => {
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))
}).catch(err => {
    console.log( "Could not connect to DB");
});

var auth = require('./controllers/auth.js');
var popDest = require('./controllers/popular-destinations.js');
app.use('/auth', auth);
app.use('/popular-destinations', popDest);

app.get('/', (req, res) => res.send('Hello World!'))

/*
* Route for testing auth functionality
*/
app.get("/secret", passport.authenticate('jwt', { session: false }), function(req, res) {
    res.json("Success! You can not see this without a token");
});

module.exports = app